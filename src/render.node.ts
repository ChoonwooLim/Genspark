// Server-side rendering — Node container only.
//
// Imported handoff prototypes are HTML/CSS animations. The browser cannot read
// pixels back out of the sandboxed iframe that plays them, which is why export
// was engine-only. Running them in a headless browser here removes that limit
// and is exactly what the handoff README prescribes: capture frames, then
// encode with ffmpeg.
//
// Frames are stepped with CDP virtual time rather than wall-clock sleeps, so a
// render is deterministic and does not drift when the box is busy.
import { Hono } from 'hono'
import { zipSync } from 'fflate'
import { spawn } from 'node:child_process'
import { randomUUID, randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import { createPool, isSafeId, resolveDatabaseUrl, resolveUploadDir } from './storage.node'

const CHROMIUM = process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium'

/** What each output can carry, and how ffmpeg is asked for it.
 *
 *  H.264 in MP4 has no alpha channel at all, so a transparent MP4 is not a
 *  setting anyone can turn on. VP9 in WebM and ProRes 4444 in MOV both do,
 *  which is what an editor wants when the intro goes over other footage. */
const FORMATS: Record<
  string,
  { ext: string; mime: string; alpha: boolean; args: (fps: number) => string[] }
> = {
  mp4: {
    ext: 'mp4',
    mime: 'video/mp4',
    alpha: false,
    args: () => ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart'],
  },
  webm: {
    ext: 'webm',
    mime: 'video/webm',
    alpha: true,
    // auto-alt-ref must be off: VP9's alternate reference frames drop alpha.
    args: () => ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '24', '-b:v', '0', '-auto-alt-ref', '0', '-row-mt', '1'],
  },
  mov: {
    ext: 'mov',
    mime: 'video/quicktime',
    alpha: true,
    args: () => ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '8'],
  },
  png: { ext: '', mime: 'application/zip', alpha: true, args: () => [] },
}
const MAX_FRAMES = 900

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS renders (
    id             uuid        PRIMARY KEY,
    label          text        NOT NULL,
    kind           text        NOT NULL,
    format         text        NOT NULL,
    width          integer     NOT NULL,
    height         integer     NOT NULL,
    fps            integer     NOT NULL,
    duration       real        NOT NULL,
    frame_count    integer     NOT NULL DEFAULT 0,
    status         text        NOT NULL DEFAULT 'queued',
    error          text,
    storage_path   text,
    byte_size      bigint      NOT NULL DEFAULT 0,
    download_token text        NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    finished_at    timestamptz
  );
  CREATE INDEX IF NOT EXISTS renders_created_at_idx ON renders (created_at DESC);
`

const frameName = (index: number) => `frame_${String(index).padStart(4, '0')}.png`

type Job = {
  id: string
  url: string
  width: number
  height: number
  fps: number
  duration: number
  format: string
  transparent: boolean
}

function rowToRender(row: any) {
  return {
    id: row.id,
    label: row.label,
    kind: row.kind,
    format: row.format,
    width: row.width,
    height: row.height,
    fps: row.fps,
    duration: Number(row.duration),
    frameCount: row.frame_count,
    status: row.status,
    error: row.error,
    byteSize: Number(row.byte_size),
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    // A sequence is served frame by frame; ?as=zip bundles it on request.
    framesUrl:
      row.storage_path && row.format === 'png'
        ? `/api/renders/${row.id}/frames?token=${row.download_token}`
        : null,
    downloadUrl: row.storage_path
      ? `/api/renders/${row.id}/download?token=${row.download_token}${
          row.format === 'png' ? '&as=zip' : ''
        }`
      : null,
  }
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      if (stderr.length > 8000) stderr = stderr.slice(-8000)
    })
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr.slice(-600)}`))
    )
  })
}

/** Capture one frame per animation timestamp.
 *
 *  CDP virtual time was the obvious tool and it does not work here: it drives
 *  the main-thread clock, but Chrome promotes transform/opacity animations —
 *  which is all of these — to the compositor, where they keep running on the
 *  real clock. Every frame came back identical, showing the final hold state,
 *  because the animation had finished long before the capture loop did.
 *
 *  The Web Animations API reaches them wherever they run: pause every
 *  animation, then set currentTime per frame. Animations are re-queried each
 *  frame so any started later are picked up too. */
async function captureFrames(job: Job): Promise<Buffer[]> {
  const { chromium } = await import('playwright-core')
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    // Required in a container: there is no user namespace to sandbox into.
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
    ],
  })

  try {
    const page = await browser.newPage({
      viewport: { width: job.width, height: job.height },
      deviceScaleFactor: 1,
    })

    await page.goto(job.url, { waitUntil: 'load', timeout: 30_000 })

    if (job.transparent) {
      // A prototype paints its own backdrop, so omitBackground alone leaves it
      // opaque — the page-level fills have to go first. Only the stage and
      // canvas are cleared; element backgrounds are the artwork itself.
      await page.addStyleTag({
        content:
          'html,body,.stage,.canvas{background:transparent !important;background-image:none !important}',
      })
    }
    // Fonts and the logo must be in before the first frame, or frame 0 is bare.
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {})

    // The built-in engine draws to a canvas from requestAnimationFrame, which
    // no amount of animation seeking reaches. Its render surface publishes a
    // seek hook instead; wait for it before capturing.
    const seekable = await page
      .waitForFunction(() => (window as any).__plazionReady === true, null, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false)

    await page.waitForTimeout(300)

    const frameCount = Math.min(Math.round(job.duration * job.fps), MAX_FRAMES)
    const step = 1000 / job.fps
    const frames: Buffer[] = []

    for (let i = 0; i < frameCount; i += 1) {
      if (seekable) {
        await page.evaluate((seconds) => (window as any).__plazionSeek(seconds), (i * step) / 1000)
      } else {
        await page.evaluate((timeMs) => {
          for (const animation of document.getAnimations()) {
            try {
              animation.pause()
              animation.currentTime = timeMs
            } catch {
              /* an animation may be finished or unseekable — leave it be */
            }
          }
        }, i * step)
      }
      frames.push(await page.screenshot({ type: 'png', omitBackground: job.transparent }))
    }
    return frames
  } finally {
    await browser.close().catch(() => {})
  }
}

async function encodeVideo(frames: Buffer[], fps: number, format: string, outFile: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'plazion-render-'))
  try {
    await Promise.all(
      frames.map((frame, i) => fs.writeFile(path.join(dir, `f_${String(i).padStart(5, '0')}.png`), frame))
    )
    await run('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(dir, 'f_%05d.png'),
      ...FORMATS[format].args(fps),
      outFile,
    ])
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function createRenderApi() {
  const api = new Hono()
  const uploadDir = await resolveUploadDir()
  const outDir = path.join(uploadDir, 'renders')
  await fs.mkdir(outDir, { recursive: true })

  const pool = await createPool('render', await resolveDatabaseUrl(uploadDir), SCHEMA)
  const available = await fs
    .access(CHROMIUM)
    .then(() => true)
    .catch(() => false)

  if (pool && available) console.log(`[render] ready · chromium=${CHROMIUM} · out=${outDir}`)
  else console.warn(`[render] disabled · database=${Boolean(pool)} chromium=${available}`)

  const adminToken = process.env.STUDIO_ADMIN_TOKEN
  const authorized = (c: any) => !adminToken || c.req.header('X-Studio-Token') === adminToken

  // One render at a time: each spawns a browser on a box shared with every
  // other project, and two concurrent captures would compete for the same CPU
  // and make both slower than running them in turn.
  let queue: Promise<unknown> = Promise.resolve()

  async function execute(job: Job, storedName: string) {
    const frames = await captureFrames(job)
    const target = path.join(outDir, storedName)
    let size = 0

    if (job.format !== 'png') {
      await encodeVideo(frames, job.fps, job.format, target)
      size = (await fs.stat(target)).size
    } else {
      // The sequence is the deliverable, so it is kept as individual frames on
      // the volume. Zipping happens on request at download time — an archive is
      // a convenience for moving it, not the artifact itself.
      await fs.mkdir(target, { recursive: true })
      for (const [i, frame] of frames.entries()) {
        await fs.writeFile(path.join(target, frameName(i)), frame)
        size += frame.byteLength
      }
    }
    await pool.query(
      `UPDATE renders SET status='done', frame_count=$2, storage_path=$3, byte_size=$4, finished_at=now()
         WHERE id=$1`,
      [job.id, frames.length, storedName, size]
    )
  }

  api.get('/status', (c) =>
    c.json({
      enabled: Boolean(pool && available),
      chromium: available,
      formats: Object.entries(FORMATS).map(([id, f]) => ({ id, alpha: f.alpha })),
    })
  )

  api.post('/', async (c) => {
    if (!pool || !available) return c.json({ error: '렌더 서비스가 준비되지 않았습니다.' }, 503)
    if (!authorized(c)) {
      return c.json({ error: '작업실 접근 코드가 필요합니다.', code: 'STUDIO_AUTH_REQUIRED' }, 401)
    }

    const body = await c.req.json().catch(() => null)
    if (!body) return c.json({ error: 'JSON 본문이 필요합니다.' }, 400)

    const format = FORMATS[body.format] ? String(body.format) : 'mp4'
    // Alpha is only offered where the container can hold it. Asked for on a
    // format that cannot, it would be a switch that silently does nothing.
    const transparent = FORMATS[format].alpha && body.transparent === true
    const fps = Math.min(Math.max(Number(body.fps) || 30, 1), 60)
    const duration = Math.min(Math.max(Number(body.duration) || 3, 0.2), 30)
    const width = Math.round(Number(body.width) || 1920)
    const height = Math.round(Number(body.height) || 1080)
    if (width % 2 || height % 2) return c.json({ error: '해상도는 짝수여야 합니다.' }, 400)

    const port = Number(process.env.PORT) || 3000
    const origin = `http://127.0.0.1:${port}`
    let url: string
    let kind: string

    if (body.kind === 'proto') {
      if (!isSafeId(String(body.bundleId).replace(/-/g, '')) || typeof body.path !== 'string') {
        return c.json({ error: '번들 정보가 올바르지 않습니다.' }, 400)
      }
      const encoded = body.path.split('/').map(encodeURIComponent).join('/')
      // ?export=1 is the handoff's own switch for stripping preview guides.
      url = `${origin}/api/handoffs/${encodeURIComponent(body.bundleId)}/files/${encoded}?export=1`
      kind = 'proto'
    } else {
      const params = new URLSearchParams({
        aspect: body.aspect === 'portrait' ? 'portrait' : 'landscape',
        glow: String(Number(body.glow) || 100),
        energy: String(Number(body.energy) || 100),
      })
      // Transparency is only meaningful for a frame sequence — an MP4 has no
      // alpha channel, and asking for one would just render onto black anyway.
      if (transparent) params.set('transparent', '1')
      if (body.projectId) params.set('project', String(body.projectId))
      url = `${origin}/render/engine?${params}`
      kind = 'engine'
    }

    const id = randomUUID()
    const token = randomBytes(24).toString('hex')
    const storedName = format === 'png' ? id : `${id}.${FORMATS[format].ext}`
    const label = String(body.label || '렌더').slice(0, 200)

    await pool.query(
      `INSERT INTO renders (id, label, kind, format, width, height, fps, duration, download_token, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'running')`,
      [id, label, kind, format, width, height, fps, duration, token]
    )

    const job: Job = { id, url, width, height, fps, duration, format, transparent }
    queue = queue.then(() =>
      execute(job, storedName).catch(async (error) => {
        console.error('[render] failed:', error?.message)
        await pool
          .query('UPDATE renders SET status=$2, error=$3, finished_at=now() WHERE id=$1', [
            id,
            'failed',
            String(error?.message || error).slice(0, 500),
          ])
          .catch(() => {})
      })
    )

    return c.json({ render: { id, status: 'running', label, format, width, height, fps, duration } }, 202)
  })

  api.get('/', async (c) => {
    if (!pool) return c.json({ renders: [], storage: 'unconfigured' })
    const { rows } = await pool.query('SELECT * FROM renders ORDER BY created_at DESC LIMIT 50')
    return c.json({ renders: rows.map(rowToRender), storage: 'server' })
  })

  api.get('/:id', async (c) => {
    if (!pool) return c.json({ error: 'not_found' }, 404)
    const { rows } = await pool
      .query('SELECT * FROM renders WHERE id=$1', [c.req.param('id')])
      .catch(() => ({ rows: [] }))
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    return c.json({ render: rowToRender(rows[0]) })
  })

  /** The frame list, so a client can write the sequence straight into a folder
   *  the way the in-browser export already does. */
  api.get('/:id/frames', async (c) => {
    if (!pool) return c.json({ error: 'not_found' }, 404)
    const { rows } = await pool
      .query('SELECT * FROM renders WHERE id=$1', [c.req.param('id')])
      .catch(() => ({ rows: [] }))
    const row = rows[0]
    if (!row || row.format !== 'png' || row.download_token !== c.req.query('token')) {
      return c.json({ error: 'not_found' }, 404)
    }
    const frames = Array.from({ length: row.frame_count }, (_, i) => ({
      name: frameName(i),
      url: `/api/renders/${row.id}/frames/${i}?token=${row.download_token}`,
    }))
    return c.json({ frames, label: row.label, width: row.width, height: row.height, fps: row.fps })
  })

  api.get('/:id/frames/:index', async (c) => {
    if (!pool) return c.json({ error: 'not_found' }, 404)
    const { rows } = await pool
      .query('SELECT * FROM renders WHERE id=$1', [c.req.param('id')])
      .catch(() => ({ rows: [] }))
    const row = rows[0]
    const index = Number(c.req.param('index'))
    if (
      !row ||
      row.format !== 'png' ||
      row.download_token !== c.req.query('token') ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= row.frame_count
    ) {
      return c.json({ error: 'not_found' }, 404)
    }
    const filePath = path.resolve(outDir, row.storage_path, frameName(index))
    if (!filePath.startsWith(outDir + path.sep)) return c.json({ error: 'not_found' }, 404)
    try {
      await fs.access(filePath)
    } catch {
      return c.json({ error: 'gone' }, 410)
    }
    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      headers: { 'Content-Type': 'image/png' },
    })
  })

  api.get('/:id/download', async (c) => {
    if (!pool) return c.json({ error: 'not_found' }, 404)
    const { rows } = await pool
      .query('SELECT * FROM renders WHERE id=$1', [c.req.param('id')])
      .catch(() => ({ rows: [] }))
    const row = rows[0]
    if (!row || !row.storage_path || row.download_token !== c.req.query('token')) {
      return c.json({ error: 'not_found' }, 404)
    }

    const filePath = path.resolve(outDir, row.storage_path)
    if (!filePath.startsWith(outDir + path.sep)) return c.json({ error: 'not_found' }, 404)
    const safeName = row.label.replace(/[^\w.\- ]+/g, '_')

    const spec = FORMATS[row.format] || FORMATS.mp4

    if (row.format === 'png') {
      // Zipping is opt-in: the sequence itself is the artifact, and an archive
      // exists only because a browser cannot hand over a folder in one click.
      if (c.req.query('as') !== 'zip') {
        return c.json(
          {
            error: 'sequence',
            message: '이미지 시퀀스입니다. 프레임 목록은 /frames, 묶어 받으려면 ?as=zip 을 쓰세요.',
          },
          409
        )
      }
      const entries = {}
      for (let i = 0; i < row.frame_count; i += 1) {
        entries[frameName(i)] = new Uint8Array(await fs.readFile(path.join(filePath, frameName(i))))
      }
      const archive = Buffer.from(zipSync(entries, { level: 0 }))
      return new Response(archive, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Length': String(archive.byteLength),
          'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}.zip"`,
        },
      })
    }

    try {
      await fs.access(filePath)
    } catch {
      return c.json({ error: 'gone' }, 410)
    }
    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      headers: {
        'Content-Type': spec.mime,
        'Content-Length': String(row.byte_size),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}.${spec.ext}"`,
      },
    })
  })

  api.delete('/:id', async (c) => {
    if (!pool) return c.json({ error: 'not_found' }, 404)
    if (!authorized(c)) {
      return c.json({ error: '작업실 접근 코드가 필요합니다.', code: 'STUDIO_AUTH_REQUIRED' }, 401)
    }
    const { rows } = await pool
      .query('DELETE FROM renders WHERE id=$1 RETURNING storage_path', [c.req.param('id')])
      .catch(() => ({ rows: [] }))
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    if (rows[0].storage_path) {
      await fs
        .rm(path.resolve(outDir, rows[0].storage_path), { recursive: true, force: true })
        .catch(() => {})
    }
    return c.json({ deleted: c.req.param('id') })
  })

  return api
}
