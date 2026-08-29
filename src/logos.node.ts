// Studio library storage — Node container only.
//
// Replaces the `{storage:'unconfigured'}` stubs the Workers entry still serves.
// The studio client (public/static/studio.js) treats any non-OK response or an
// 'unconfigured' body as "backend not ready" and falls back to IndexedDB, so
// these routes keep that exact contract when the database is unavailable.
//
// Mutations require the same X-Studio-Token as the AI routes: the library is a
// public URL, and an unauthenticated DELETE would let any visitor wipe it.
// Reads stay open so the gallery renders for everyone.
import { Hono } from 'hono'
import { createReadStream } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import { createPool, isSafeId, resolveDatabaseUrl, resolveUploadDir } from './storage.node'

const MAX_LOGO_BYTES = Number(process.env.STUDIO_MAX_LOGO_BYTES) || 12 * 1024 * 1024

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS studio_logos (
    id                   text        PRIMARY KEY,
    name                 text        NOT NULL,
    settings             jsonb       NOT NULL DEFAULT '{}'::jsonb,
    preset_id            text,
    auto_register_preset boolean     NOT NULL DEFAULT false,
    frame_rate           integer     NOT NULL DEFAULT 30,
    duration             real        NOT NULL DEFAULT 3,
    logo_path            text        NOT NULL,
    logo_mime            text        NOT NULL,
    byte_size            bigint      NOT NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS studio_logos_updated_at_idx
    ON studio_logos (updated_at DESC);

  CREATE TABLE IF NOT EXISTS studio_presets (
    id         text        PRIMARY KEY,
    name       text        NOT NULL,
    data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS studio_presets_updated_at_idx
    ON studio_presets (updated_at DESC);
`

function rowToProject(row: any) {
  return {
    id: row.id,
    name: row.name,
    settings: row.settings || {},
    presetId: row.preset_id || null,
    autoRegisterPreset: row.auto_register_preset,
    frameRate: row.frame_rate,
    duration: Number(row.duration),
    logoUrl: `/api/logos/${row.id}/image`,
    byteSize: Number(row.byte_size),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createStudioLibraryApi() {
  const api = new Hono()
  const uploadDir = await resolveUploadDir()
  const logoDir = path.join(uploadDir, 'logos')
  await fs.mkdir(logoDir, { recursive: true })

  const pool = await createPool('studio', await resolveDatabaseUrl(uploadDir), SCHEMA)
  if (pool) {
    console.log(`[studio] library ready · storage=${logoDir}`)
  } else {
    console.warn('[studio] no database — library falls back to browser IndexedDB')
  }

  const adminToken = process.env.STUDIO_ADMIN_TOKEN

  /** Same rule as the AI routes: when no token is configured the gate is open,
   *  so a local run without secrets still works. */
  const authorized = (c: any) => !adminToken || c.req.header('X-Studio-Token') === adminToken

  const denied = (c: any) =>
    c.json(
      { error: '작업실 접근 코드가 필요합니다.', code: 'STUDIO_AUTH_REQUIRED' },
      401
    )

  // The client reads `storage === 'unconfigured'` as "use IndexedDB". Keeping
  // the stub shape here means a database outage degrades to local storage
  // rather than surfacing an error in the UI.
  const unconfigured = (c: any, key: 'logos' | 'presets') =>
    c.json({ [key]: [], storage: 'unconfigured' })

  // ===== Logos =====

  api.get('/logos', async (c) => {
    if (!pool) return unconfigured(c, 'logos')
    const { rows } = await pool.query(
      `SELECT * FROM studio_logos ORDER BY updated_at DESC LIMIT 200`
    )
    return c.json({ logos: rows.map(rowToProject), storage: 'server' })
  })

  api.post('/logos', async (c) => {
    if (!pool) return unconfigured(c, 'logos')
    if (!authorized(c)) return denied(c)

    const form = await c.req.formData().catch(() => null)
    if (!form) return c.json({ error: 'multipart/form-data 요청이 필요합니다.' }, 400)

    let metadata: any
    try {
      metadata = JSON.parse(String(form.get('metadata') ?? ''))
    } catch {
      return c.json({ error: 'metadata 필드를 해석하지 못했습니다.' }, 400)
    }

    const file = form.get('logo')
    if (!(file instanceof File)) return c.json({ error: '로고 파일이 없습니다.' }, 400)
    if (!isSafeId(metadata?.id)) return c.json({ error: '프로젝트 id 형식이 올바르지 않습니다.' }, 400)

    const name = String(metadata.name ?? '').trim().slice(0, 200)
    if (!name) return c.json({ error: '프로젝트 이름이 필요합니다.' }, 400)

    const mime = file.type || 'image/png'
    const ext = MIME_EXT[mime]
    if (!ext) return c.json({ error: `지원하지 않는 이미지 형식입니다 (${mime}).` }, 415)

    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.byteLength > MAX_LOGO_BYTES) {
      return c.json(
        { error: `로고 파일이 상한(${Math.floor(MAX_LOGO_BYTES / 1024 / 1024)}MB)을 넘었습니다.` },
        413
      )
    }

    // Re-saving a project may change the image format; drop any previous file
    // for this id so a .png does not linger after a .svg replaces it.
    const previous = await pool.query('SELECT logo_path FROM studio_logos WHERE id = $1', [metadata.id])
    const storedName = `${metadata.id}.${ext}`
    await fs.writeFile(path.join(logoDir, storedName), bytes)
    const stale = previous.rows[0]?.logo_path
    if (stale && stale !== storedName) {
      await fs.rm(path.join(logoDir, stale), { force: true }).catch(() => {})
    }

    const { rows } = await pool.query(
      `INSERT INTO studio_logos
         (id, name, settings, preset_id, auto_register_preset, frame_rate, duration,
          logo_path, logo_mime, byte_size, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, now()), now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         settings = EXCLUDED.settings,
         preset_id = EXCLUDED.preset_id,
         auto_register_preset = EXCLUDED.auto_register_preset,
         frame_rate = EXCLUDED.frame_rate,
         duration = EXCLUDED.duration,
         logo_path = EXCLUDED.logo_path,
         logo_mime = EXCLUDED.logo_mime,
         byte_size = EXCLUDED.byte_size,
         updated_at = now()
       RETURNING *`,
      [
        metadata.id,
        name,
        JSON.stringify(metadata.settings ?? {}),
        metadata.presetId ? String(metadata.presetId).slice(0, 128) : null,
        Boolean(metadata.autoRegisterPreset),
        Number(metadata.frameRate) || 30,
        Number(metadata.duration) || 3,
        storedName,
        mime,
        bytes.byteLength,
        metadata.createdAt || null,
      ]
    )
    return c.json({ logo: rowToProject(rows[0]) })
  })

  api.get('/logos/:id/image', async (c) => {
    if (!pool) return c.json({ error: 'not_found' }, 404)
    const id = c.req.param('id')
    if (!isSafeId(id)) return c.json({ error: 'not_found' }, 404)

    const { rows } = await pool.query(
      'SELECT logo_path, logo_mime, byte_size FROM studio_logos WHERE id = $1',
      [id]
    )
    const row = rows[0]
    if (!row) return c.json({ error: 'not_found' }, 404)

    const filePath = path.join(logoDir, row.logo_path)
    try {
      await fs.access(filePath)
    } catch {
      return c.json({ error: 'gone' }, 410)
    }

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
    return new Response(stream, {
      headers: {
        'Content-Type': row.logo_mime,
        'Content-Length': String(row.byte_size),
      },
    })
  })

  api.delete('/logos/:id', async (c) => {
    if (!pool) return c.json({ error: 'storage_unavailable' }, 503)
    if (!authorized(c)) return denied(c)

    const id = c.req.param('id')
    if (!isSafeId(id)) return c.json({ error: 'not_found' }, 404)

    const { rows } = await pool.query(
      'DELETE FROM studio_logos WHERE id = $1 RETURNING logo_path',
      [id]
    )
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await fs.rm(path.join(logoDir, rows[0].logo_path), { force: true }).catch(() => {})
    return c.json({ deleted: id })
  })

  // ===== Presets =====

  api.get('/presets', async (c) => {
    if (!pool) return unconfigured(c, 'presets')
    const { rows } = await pool.query(
      'SELECT id, name, data, updated_at FROM studio_presets ORDER BY updated_at DESC LIMIT 200'
    )
    return c.json({
      presets: rows.map((r: any) => ({ ...r.data, id: r.id, name: r.name, updatedAt: r.updated_at })),
      storage: 'server',
    })
  })

  api.post('/presets', async (c) => {
    if (!pool) return unconfigured(c, 'presets')
    if (!authorized(c)) return denied(c)

    const body = await c.req.json().catch(() => null)
    if (!isSafeId(body?.id)) return c.json({ error: '프리셋 id 형식이 올바르지 않습니다.' }, 400)

    const name = String(body.name ?? '').trim().slice(0, 200)
    if (!name) return c.json({ error: '프리셋 이름이 필요합니다.' }, 400)

    const { id: _id, name: _name, updatedAt: _updatedAt, ...data } = body
    const { rows } = await pool.query(
      `INSERT INTO studio_presets (id, name, data, updated_at)
       VALUES ($1,$2,$3, now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, data = EXCLUDED.data, updated_at = now()
       RETURNING id, name, data, updated_at`,
      [body.id, name, JSON.stringify(data)]
    )
    const row = rows[0]
    return c.json({ preset: { ...row.data, id: row.id, name: row.name, updatedAt: row.updated_at } })
  })

  api.delete('/presets/:id', async (c) => {
    if (!pool) return c.json({ error: 'storage_unavailable' }, 503)
    if (!authorized(c)) return denied(c)

    const id = c.req.param('id')
    if (!isSafeId(id)) return c.json({ error: 'not_found' }, 404)

    const { rows } = await pool.query('DELETE FROM studio_presets WHERE id = $1 RETURNING id', [id])
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    return c.json({ deleted: id })
  })

  return api
}
