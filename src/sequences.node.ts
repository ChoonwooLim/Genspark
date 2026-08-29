// PNG-sequence archive storage — Node container only.
//
// Kept out of src/app.tsx on purpose: that module has to stay runtime-agnostic
// so the Cloudflare Workers entry can import it, and none of this (node:fs, pg)
// exists on Workers. src/server.node.ts mounts this; src/index.tsx does not, so
// on Workers /api/sequences simply 404s and the client hides the UI.
//
// Uploads arrive in chunks because Orbitron's shared nginx sets
// `client_max_body_size 50M` on this vhost, and a 90-frame 1920x1080
// transparent sequence can exceed that in a single request.
import { Hono } from 'hono'
import { createHash, randomUUID, randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Readable } from 'node:stream'

const CHUNK_SIZE = 8 * 1024 * 1024
const MAX_UPLOAD_BYTES = Number(process.env.SEQUENCE_MAX_BYTES) || 512 * 1024 * 1024
// Disk on the Orbitron box is shared with every other project, so keep only the
// newest N archives and delete the rest after each successful upload.
const RETENTION = Number(process.env.SEQUENCE_RETENTION) || 50
const UPLOAD_TTL_MS = 30 * 60 * 1000

type SequenceMeta = {
  filename: string
  aspect: string
  width: number
  height: number
  fps: number
  frameCount: number
}

type Pending = {
  uploadId: string
  tmpPath: string
  received: number
  nextIndex: number
  meta: SequenceMeta
  startedAt: number
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS png_sequences (
    id             uuid PRIMARY KEY,
    filename       text        NOT NULL,
    storage_path   text        NOT NULL,
    aspect         text        NOT NULL,
    width          integer     NOT NULL,
    height         integer     NOT NULL,
    fps            integer     NOT NULL,
    frame_count    integer     NOT NULL,
    byte_size      bigint      NOT NULL,
    sha256         text        NOT NULL,
    download_token text        NOT NULL UNIQUE,
    created_at     timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS png_sequences_created_at_idx
    ON png_sequences (created_at DESC);
`

/** Resolve the Postgres URL. Orbitron injects secrets as files (other projects
 *  on the box get DATABASE_URL_FILE), so that form is the primary path; the
 *  plain env var covers local runs and the on-volume file lets the database be
 *  attached without waiting for an env-var redeploy. */
async function resolveDatabaseUrl(uploadDir: string): Promise<string | null> {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim()

  const fromFile = process.env.DATABASE_URL_FILE
  if (fromFile) {
    try {
      return (await fs.readFile(fromFile, 'utf8')).trim()
    } catch {
      console.warn(`[sequences] DATABASE_URL_FILE set but unreadable: ${fromFile}`)
    }
  }

  const onVolume = ['/app/data/database-url', path.join(uploadDir, '..', 'data', 'database-url')]
  for (const candidate of onVolume) {
    try {
      const value = (await fs.readFile(candidate, 'utf8')).trim()
      if (value) return value
    } catch {
      /* not present — try the next candidate */
    }
  }
  return null
}

async function resolveUploadDir(): Promise<string> {
  if (process.env.UPLOAD_DIR) {
    await fs.mkdir(process.env.UPLOAD_DIR, { recursive: true })
    return path.resolve(process.env.UPLOAD_DIR)
  }

  // Orbitron bind-mounts /app/uploads into the container, so its presence is
  // what identifies that environment. Only adopt it when it already exists —
  // on Windows a bare '/app/uploads' resolves to <drive>:\app\uploads and
  // mkdir would happily create a stray directory on a dev machine.
  try {
    const stat = await fs.stat('/app/uploads')
    if (stat.isDirectory()) return path.resolve('/app/uploads')
  } catch {
    /* not this environment — fall back to a project-local directory */
  }

  const local = path.resolve('./uploads')
  await fs.mkdir(local, { recursive: true })
  return local
}

/** Keep the newest RETENTION rows; delete older rows and their archives. */
async function prune(pool: any, uploadDir: string) {
  const { rows } = await pool.query(
    `DELETE FROM png_sequences
      WHERE id IN (SELECT id FROM png_sequences ORDER BY created_at DESC OFFSET $1)
      RETURNING storage_path`,
    [RETENTION]
  )
  for (const row of rows) {
    await fs.rm(path.resolve(uploadDir, row.storage_path), { force: true }).catch(() => {})
  }
}

export async function createSequencesApi() {
  const api = new Hono()
  const uploadDir = await resolveUploadDir()
  const tmpDir = path.join(uploadDir, '.tmp')
  await fs.mkdir(tmpDir, { recursive: true })

  const databaseUrl = await resolveDatabaseUrl(uploadDir)
  let pool: any = null

  if (databaseUrl) {
    // A database that is down, unreachable, or not yet provisioned must not
    // take the whole site with it — this feature degrades, the intro page does
    // not. Same reason the pool gets an 'error' handler: node-postgres emits on
    // idle clients dropped by the server, and an unhandled one would exit.
    try {
      const { default: pg } = await import('pg')
      const candidate = new pg.Pool({
        connectionString: databaseUrl,
        max: 4,
        connectionTimeoutMillis: 8000,
      })
      candidate.on('error', (err: Error) => console.error('[sequences] idle client error:', err.message))
      await candidate.query(SCHEMA)
      pool = candidate
      console.log(`[sequences] postgres ready · storage=${uploadDir}`)
    } catch (err) {
      console.error(
        '[sequences] postgres unavailable — server-side storage DISABLED:',
        err instanceof Error ? err.message : err
      )
    }
  } else {
    console.warn(
      '[sequences] no DATABASE_URL / DATABASE_URL_FILE / /app/data/database-url — ' +
        'server-side sequence storage is DISABLED'
    )
  }

  // Half-written .part files from an interrupted deploy are dead weight: the
  // in-memory pending map does not survive a restart, so they can never resume.
  for (const name of await fs.readdir(tmpDir).catch(() => [] as string[])) {
    await fs.rm(path.join(tmpDir, name), { force: true }).catch(() => {})
  }

  const pending = new Map<string, Pending>()

  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [id, entry] of pending) {
      if (now - entry.startedAt > UPLOAD_TTL_MS) {
        pending.delete(id)
        fs.rm(entry.tmpPath, { force: true }).catch(() => {})
      }
    }
  }, 60_000)
  sweep.unref?.()

  const requireDb = (c: any) =>
    pool
      ? null
      : c.json(
          {
            error: 'storage_unavailable',
            message: '서버 저장이 아직 활성화되지 않았습니다 (PostgreSQL 미설정).',
          },
          503
        )

  api.get('/status', (c) =>
    c.json({
      enabled: Boolean(pool),
      chunkSize: CHUNK_SIZE,
      maxBytes: MAX_UPLOAD_BYTES,
      retention: RETENTION,
    })
  )

  api.post('/init', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked

    const body = await c.req.json().catch(() => null)
    if (!body) return c.json({ error: 'bad_request', message: 'JSON 본문이 필요합니다.' }, 400)

    const width = Number(body.width)
    const height = Number(body.height)
    const frameCount = Number(body.frameCount)
    const fps = Number(body.fps)
    const byteSize = Number(body.byteSize)

    if (![width, height, frameCount, fps, byteSize].every((n) => Number.isFinite(n) && n > 0)) {
      return c.json({ error: 'bad_request', message: '메타데이터 값이 올바르지 않습니다.' }, 400)
    }
    if (byteSize > MAX_UPLOAD_BYTES) {
      return c.json(
        {
          error: 'too_large',
          message: `업로드 상한(${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB)을 넘었습니다.`,
        },
        413
      )
    }

    const uploadId = randomUUID()
    const tmpPath = path.join(tmpDir, `${uploadId}.part`)
    await fs.writeFile(tmpPath, '')
    pending.set(uploadId, {
      uploadId,
      tmpPath,
      received: 0,
      nextIndex: 0,
      startedAt: Date.now(),
      meta: {
        filename: String(body.filename || `plazion_${width}x${height}_${fps}fps.zip`).slice(0, 200),
        aspect: String(body.aspect || 'landscape').slice(0, 32),
        width,
        height,
        fps,
        frameCount,
      },
    })
    return c.json({ uploadId, chunkSize: CHUNK_SIZE })
  })

  api.put('/:uploadId/chunk', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked

    const entry = pending.get(c.req.param('uploadId'))
    if (!entry) return c.json({ error: 'unknown_upload', message: '업로드 세션이 만료되었습니다.' }, 404)

    // Chunks must arrive in order — the archive is appended to, never seeked.
    const index = Number(c.req.query('index'))
    if (!Number.isInteger(index) || index !== entry.nextIndex) {
      return c.json(
        { error: 'out_of_order', message: `청크 순서 오류 (기대 ${entry.nextIndex}, 수신 ${index}).` },
        409
      )
    }

    const chunk = Buffer.from(await c.req.arrayBuffer())
    if (entry.received + chunk.byteLength > MAX_UPLOAD_BYTES) {
      pending.delete(entry.uploadId)
      await fs.rm(entry.tmpPath, { force: true }).catch(() => {})
      return c.json({ error: 'too_large', message: '업로드 상한을 넘었습니다.' }, 413)
    }

    await fs.appendFile(entry.tmpPath, chunk)
    entry.received += chunk.byteLength
    entry.nextIndex += 1
    return c.json({ received: entry.received, nextIndex: entry.nextIndex })
  })

  api.post('/:uploadId/complete', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked

    const entry = pending.get(c.req.param('uploadId'))
    if (!entry) return c.json({ error: 'unknown_upload', message: '업로드 세션이 만료되었습니다.' }, 404)

    const body = await c.req.json().catch(() => ({} as any))

    const hash = createHash('sha256')
    await new Promise<void>((resolve, reject) => {
      createReadStream(entry.tmpPath)
        .on('data', (d) => hash.update(d))
        .on('end', () => resolve())
        .on('error', reject)
    })
    const sha256 = hash.digest('hex')

    // The client hashes the same bytes before sending; a mismatch means the
    // archive was truncated or reordered in transit, so refuse to record it.
    if (body.sha256 && String(body.sha256) !== sha256) {
      pending.delete(entry.uploadId)
      await fs.rm(entry.tmpPath, { force: true }).catch(() => {})
      return c.json({ error: 'checksum_mismatch', message: '체크섬이 일치하지 않습니다.' }, 422)
    }

    const id = randomUUID()
    const token = randomBytes(24).toString('hex')
    const storedName = `${id}.zip`
    await fs.rename(entry.tmpPath, path.join(uploadDir, storedName))
    pending.delete(entry.uploadId)

    const { meta } = entry
    await pool.query(
      `INSERT INTO png_sequences
         (id, filename, storage_path, aspect, width, height, fps, frame_count,
          byte_size, sha256, download_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        meta.filename,
        storedName,
        meta.aspect,
        meta.width,
        meta.height,
        meta.fps,
        meta.frameCount,
        entry.received,
        sha256,
        token,
      ]
    )

    await prune(pool, uploadDir)

    return c.json({
      id,
      filename: meta.filename,
      byteSize: entry.received,
      sha256,
      downloadUrl: `/api/sequences/${id}/download?token=${token}`,
    })
  })

  api.get('/', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked

    const { rows } = await pool.query(
      `SELECT id, filename, aspect, width, height, fps, frame_count, byte_size,
              download_token, created_at
         FROM png_sequences
        ORDER BY created_at DESC
        LIMIT 50`
    )
    return c.json({
      sequences: rows.map((r: any) => ({
        id: r.id,
        filename: r.filename,
        aspect: r.aspect,
        width: r.width,
        height: r.height,
        fps: r.fps,
        frameCount: r.frame_count,
        byteSize: Number(r.byte_size),
        createdAt: r.created_at,
        downloadUrl: `/api/sequences/${r.id}/download?token=${r.download_token}`,
      })),
    })
  })

  api.get('/:id/download', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked

    const id = c.req.param('id')
    const token = c.req.query('token') || ''

    // Look the row up by id alone, then compare the token in constant-ish time
    // via a plain equality check — the id is a uuid, so enumeration is not the
    // threat model here; a wrong or missing token is simply a 404.
    const { rows } = await pool.query(
      'SELECT filename, storage_path, byte_size, download_token FROM png_sequences WHERE id = $1',
      [id]
    )
    const row = rows[0]
    if (!row || row.download_token !== token) {
      return c.json({ error: 'not_found', message: '없거나 토큰이 올바르지 않습니다.' }, 404)
    }

    // storage_path is a generated `<uuid>.zip` and never client input, but
    // resolve and re-check anyway so a bad row can't escape the upload dir.
    const filePath = path.resolve(uploadDir, row.storage_path)
    if (!filePath.startsWith(uploadDir + path.sep)) {
      return c.json({ error: 'not_found' }, 404)
    }
    try {
      await fs.access(filePath)
    } catch {
      return c.json({ error: 'gone', message: '보관 기간이 지나 파일이 정리되었습니다.' }, 410)
    }

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(row.byte_size),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(row.filename)}"`,
      },
    })
  })

  return api
}
