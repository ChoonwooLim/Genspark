// Genspark handoff bundle import — Node container only.
//
// A Genspark project export (project.zip) is a whole design handoff, not one
// image: HTML prototypes, .jsx animation references, the logo and other
// assets, a spec README, and a companion Remotion project. This stores the
// bundle on the persistent volume, records a manifest plus the parsed spec in
// Postgres, and serves the files back so the studio can adopt the logo and the
// timing values and preview the original HTML.
//
// What this deliberately does NOT do: run the bundle's .jsx in the site's
// engine. The handoff README states those files are design references rather
// than production code, and executing imported JSX would mean transpiling and
// running untrusted code with this origin's privileges. HTML previews are
// served under `Content-Security-Policy: sandbox`, which puts them in an
// opaque origin so a bundle cannot reach sessionStorage (where the studio
// access code lives) or the rest of the site.
import { Hono } from 'hono'
import { unzipSync } from 'fflate'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import { createPool, isSafeId, resolveDatabaseUrl, resolveUploadDir } from './storage.node'

const MAX_ZIP_BYTES = Number(process.env.HANDOFF_MAX_BYTES) || 64 * 1024 * 1024
// Zip bombs expand far beyond their compressed size, so cap the decompressed
// total and the per-entry size as well as the entry count.
const MAX_TOTAL_BYTES = 512 * 1024 * 1024
const MAX_ENTRY_BYTES = 64 * 1024 * 1024
const MAX_ENTRIES = 1000

const TEXT_EXT = new Set(['md', 'txt', 'json', 'jsx', 'tsx', 'ts', 'js', 'css', 'html', 'svg', 'yml', 'yaml'])

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  jsx: 'text/plain; charset=utf-8',
  tsx: 'text/plain; charset=utf-8',
  ts: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
  md: 'text/plain; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS handoff_bundles (
    id         uuid        PRIMARY KEY,
    name       text        NOT NULL,
    filename   text        NOT NULL,
    byte_size  bigint      NOT NULL,
    sha256     text        NOT NULL,
    spec       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    manifest   jsonb       NOT NULL DEFAULT '[]'::jsonb,
    entrypoints jsonb      NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS handoff_bundles_created_at_idx
    ON handoff_bundles (created_at DESC);
`

/** Pull the machine-usable values out of a handoff README.
 *
 *  Handoffs do not share one shape. The PLAZION bundle puts its numbers in a
 *  two-column "Master Specifications" table with a three-column timeline in
 *  seconds; the GreenB bundle states the same things as a Korean bullet list
 *  with a two-column timeline in milliseconds. So rather than matching one
 *  layout, this collects key/value facts from every table row and every
 *  `- **key:** value` bullet, then looks them up by meaning. */
export function parseHandoffSpec(md: string) {
  const spec: any = {
    title: null,
    duration: null,
    fps: null,
    resolutions: {} as Record<string, { width: number; height: number }>,
    colors: {} as Record<string, string>,
    tokens: [] as { name: string; value: string }[],
    variants: [] as any[],
    timeline: [] as any[],
  }

  const title = md.match(/^#\s+(?:Handoff:\s*)?(.+)$/m)
  if (title) spec.title = title[1].trim()

  const clean = (value: string) => value.replace(/\*\*/g, '').replace(/`/g, '').trim()

  // Every markdown table row, split into cells, plus bullet definitions.
  const rows: string[][] = []
  for (const line of md.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|').map((cell) => cell.trim())
      if (cells.length >= 2 && !cells.every((cell) => /^:?-+:?$/.test(cell))) rows.push(cells)
    }
  }

  const facts: [string, string][] = rows
    .filter((cells) => cells[0] && cells[1])
    .map((cells) => [clean(cells[0]), clean(cells[1])] as [string, string])

  for (const match of md.matchAll(/^\s*[-*]\s+\*\*([^:*]+):?\*\*:?\s*(.+)$/gm)) {
    facts.push([clean(match[1]), clean(match[2])])
  }

  // Bullet keys can be prose, and a timeline header row ("| 시간 | 이벤트 |")
  // is a fact too. Restrict lookups to short label-like keys and let the caller
  // reject a match that does not actually parse, so the first loose hit cannot
  // shadow the real value further down.
  const labelFacts = facts.filter(([key]) => key.length <= 24)
  const findAll = (re: RegExp) => labelFacts.filter(([key]) => re.test(key)).map(([, value]) => value)
  const find = (re: RegExp) => findAll(re)[0]

  // ---- duration: "3.0 s", "5.00s", "5000ms" ----
  for (const candidate of findAll(/^(duration|길이|재생\s*시간|러닝\s*타임)$/i)) {
    const ms = candidate.match(/([\d.]+)\s*ms/i)
    const sec = candidate.match(/([\d.]+)\s*s(?![a-z])/i)
    if (ms) spec.duration = Number(ms[1]) / 1000
    else if (sec) spec.duration = Number(sec[1])
    if (spec.duration != null) break
  }

  // ---- frame rate ----
  for (const candidate of findAll(/frame\s*rate|(^|\s)fps|프레임\s*(레이트|률|수)/i)) {
    const match = candidate.match(/(\d+)\s*fps/i)
    if (match) {
      spec.fps = Number(match[1])
      break
    }
  }

  // ---- resolutions ----
  const readSize = (value?: string) => {
    const m = value && value.match(/(\d{2,5})\s*[×x*]\s*(\d{2,5})/i)
    return m ? { width: Number(m[1]), height: Number(m[2]) } : null
  }
  const landscape = readSize(find(/landscape\s*resolution|가로\s*해상도/i))
  const portrait = readSize(find(/portrait\s*resolution|세로\s*해상도/i))
  if (landscape) spec.resolutions.landscape = landscape
  if (portrait) spec.resolutions.portrait = portrait
  if (!landscape && !portrait) {
    // A single stated resolution: classify it by its own orientation.
    const only = readSize(find(/^(resolution|해상도|출력\s*해상도|캔버스)$/i))
    if (only) spec.resolutions[only.width >= only.height ? 'landscape' : 'portrait'] = only
  }

  // ---- named colours ----
  for (const [re, label] of [
    [/^(background|배경|배경색)$/i, 'background'],
    [/^(primary(\s*logo)?\s*colou?r|주\s*색|브랜드\s*컬러|primary)$/i, 'primary'],
    [/^(accent(\s*glow)?|강조\s*색|발광\s*색)$/i, 'accent'],
    [/^(impact\s*flash|임팩트\s*플래시)$/i, 'flash'],
  ] as [RegExp, string][]) {
    const value = find(re)
    if (value) spec.colors[label] = value
  }

  // ---- design tokens: any row whose value carries a colour literal ----
  const seen = new Set<string>()
  for (const [key, value] of facts) {
    if (!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(value)) continue
    if (seen.has(key)) continue
    seen.add(key)
    spec.tokens.push({ name: key, value })
  }

  // ---- variants (optional; only some handoffs offer alternatives) ----
  for (const match of md.matchAll(
    /^###\s*(✅\s*)?Variant\s*(\d+)\s*[—-]\s*([^(\n]+?)(?:\s*\(([^)]*)\))?\s*$/gm
  )) {
    spec.variants.push({
      number: Number(match[2]),
      name: match[3].trim(),
      selected: Boolean(match[1]) || /selected/i.test(match[4] || ''),
      note: (match[4] || '').trim() || null,
    })
  }

  // ---- timeline: any table row starting with a time or time range ----
  const TIME = /^([\d.]+)\s*(ms|s)?\s*(?:[–—-]\s*([\d.]+)\s*(ms|s)?)?\s*$/i
  for (const cells of rows) {
    const raw = cells[0].replace(/\*\*/g, '').trim()
    // A layer table's first column is 1, 2, 3 — those parse as times but are
    // not. Require a unit, a range, or a decimal before treating it as one.
    if (!/ms|s|[–—-]|\./i.test(raw)) continue
    const match = raw.match(TIME)
    if (!match) continue
    const event = clean(cells[cells.length - 1])
    if (!event || TIME.test(event)) continue

    // Unit is stated on either end of the range; seconds when absent, which is
    // how the PLAZION table's "Time (s)" column is written.
    const unit = (match[4] || match[2] || 's').toLowerCase()
    const scale = unit === 'ms' ? 0.001 : 1
    const start = Number(match[1]) * scale
    const end = match[3] === undefined ? start : Number(match[3]) * scale
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue

    spec.timeline.push({
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      label: raw,
      frames: cells.length >= 3 ? clean(cells[1]) || null : null,
      event: event.length > 400 ? `${event.slice(0, 400)}…` : event,
    })
  }

  return spec
}

/** Pick the files the studio cares about out of a flat entry list. */
export function detectEntrypoints(names: string[]) {
  const byScore = (candidates: string[], score: (n: string) => number) =>
    candidates.map((n) => [n, score(n)] as const).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const lower = (n: string) => n.toLowerCase()
  // Prefer files inside a real handoff folder over the flattened root copies
  // Genspark also includes, and prefer shallower paths within that.
  const depthBonus = (n: string) => (lower(n).includes('design_handoff') ? 100 : 0) - n.split('/').length

  return {
    readme: byScore(names.filter((n) => /(^|\/)readme\.md$/i.test(n)), depthBonus),
    logo: byScore(
      names.filter((n) => /\.(png|svg|webp|jpe?g)$/i.test(n) && /logo/i.test(n)),
      (n) => depthBonus(n) + (lower(n).includes('/assets/') ? 50 : 0)
    ),
    thumbnail: byScore(names.filter((n) => /thumbnail\.(jpe?g|png|webp)$/i.test(n)), depthBonus),
    previews: names.filter((n) => /\.html$/i.test(n) && lower(n).includes('design_handoff')),
    variants: names.filter((n) => /variant\d.*\.(jsx|tsx)$/i.test(n) && lower(n).includes('design_handoff')),
  }
}

export async function createHandoffApi() {
  const api = new Hono()
  const uploadDir = await resolveUploadDir()
  const rootDir = path.join(uploadDir, 'handoffs')
  await fs.mkdir(rootDir, { recursive: true })

  const pool = await createPool('handoff', await resolveDatabaseUrl(uploadDir), SCHEMA)
  if (pool) console.log(`[handoff] ready · storage=${rootDir}`)
  else console.warn('[handoff] no database — bundle import is DISABLED')

  const adminToken = process.env.STUDIO_ADMIN_TOKEN
  const authorized = (c: any) => !adminToken || c.req.header('X-Studio-Token') === adminToken
  const denied = (c: any) =>
    c.json({ error: '작업실 접근 코드가 필요합니다.', code: 'STUDIO_AUTH_REQUIRED' }, 401)
  const requireDb = (c: any) =>
    pool ? null : c.json({ error: '핸드오프 가져오기가 비활성 상태입니다 (PostgreSQL 미설정).' }, 503)

  api.get('/status', (c) => c.json({ enabled: Boolean(pool), maxBytes: MAX_ZIP_BYTES }))

  api.post('/', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked
    if (!authorized(c)) return denied(c)

    const form = await c.req.formData().catch(() => null)
    const file = form?.get('bundle')
    if (!(file instanceof File)) return c.json({ error: 'project.zip 파일이 필요합니다.' }, 400)

    const zipBytes = new Uint8Array(await file.arrayBuffer())
    if (zipBytes.byteLength > MAX_ZIP_BYTES) {
      return c.json(
        { error: `번들이 상한(${Math.floor(MAX_ZIP_BYTES / 1024 / 1024)}MB)을 넘었습니다.` },
        413
      )
    }

    let files: Record<string, Uint8Array>
    try {
      files = unzipSync(zipBytes)
    } catch {
      return c.json({ error: 'ZIP을 해석하지 못했습니다.' }, 400)
    }

    const entries = Object.entries(files).filter(([name]) => !name.endsWith('/'))
    if (!entries.length) return c.json({ error: '빈 ZIP입니다.' }, 400)
    if (entries.length > MAX_ENTRIES) return c.json({ error: '항목이 너무 많습니다.' }, 413)

    let total = 0
    for (const [name, data] of entries) {
      // Zip-slip: an entry named ../../x escapes the extraction root.
      if (name.includes('\\') || name.split('/').some((part) => part === '..' || part === '')) {
        return c.json({ error: `안전하지 않은 경로가 포함돼 있습니다: ${name}` }, 400)
      }
      if (data.byteLength > MAX_ENTRY_BYTES) return c.json({ error: `파일이 너무 큽니다: ${name}` }, 413)
      total += data.byteLength
      if (total > MAX_TOTAL_BYTES) return c.json({ error: '압축 해제 크기가 상한을 넘었습니다.' }, 413)
    }

    const id = randomUUID()
    const bundleDir = path.join(rootDir, id)
    const names = entries.map(([name]) => name)
    const entrypoints = detectEntrypoints(names)

    for (const [name, data] of entries) {
      const target = path.join(bundleDir, name)
      if (!target.startsWith(bundleDir + path.sep)) {
        await fs.rm(bundleDir, { recursive: true, force: true }).catch(() => {})
        return c.json({ error: `안전하지 않은 경로: ${name}` }, 400)
      }
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, data)
    }

    let spec: any = {}
    if (entrypoints.readme) {
      try {
        spec = parseHandoffSpec(Buffer.from(files[entrypoints.readme]).toString('utf8'))
      } catch {
        spec = {}
      }
    }

    const manifest = entries.map(([name, data]) => ({
      path: name,
      size: data.byteLength,
      text: TEXT_EXT.has(name.split('.').pop()!.toLowerCase()),
    }))

    const sha256 = createHash('sha256').update(zipBytes).digest('hex')
    const name = String(form?.get('name') || spec.title || file.name || 'Handoff').slice(0, 200)

    const { rows } = await pool.query(
      `INSERT INTO handoff_bundles (id, name, filename, byte_size, sha256, spec, manifest, entrypoints)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        id,
        name,
        file.name || 'project.zip',
        zipBytes.byteLength,
        sha256,
        JSON.stringify(spec),
        JSON.stringify(manifest),
        JSON.stringify(entrypoints),
      ]
    )
    return c.json({ handoff: rowToBundle(rows[0]) })
  })

  api.get('/', async (c) => {
    if (!pool) return c.json({ handoffs: [], storage: 'unconfigured' })
    const { rows } = await pool.query(
      `SELECT id, name, filename, byte_size, spec, entrypoints, created_at,
              jsonb_array_length(manifest) AS file_count
         FROM handoff_bundles ORDER BY created_at DESC LIMIT 100`
    )
    return c.json({
      handoffs: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        filename: r.filename,
        byteSize: Number(r.byte_size),
        fileCount: Number(r.file_count),
        spec: r.spec,
        entrypoints: r.entrypoints,
        createdAt: r.created_at,
        thumbnailUrl: r.entrypoints?.thumbnail ? `/api/handoffs/${r.id}/files/${r.entrypoints.thumbnail}` : null,
        logoUrl: r.entrypoints?.logo ? `/api/handoffs/${r.id}/files/${r.entrypoints.logo}` : null,
      })),
      storage: 'server',
    })
  })

  api.get('/:id', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked
    const id = c.req.param('id')
    const { rows } = await pool.query('SELECT * FROM handoff_bundles WHERE id = $1', [id]).catch(() => ({ rows: [] }))
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    return c.json({ handoff: { ...rowToBundle(rows[0]), manifest: rows[0].manifest } })
  })

  api.get('/:id/files/*', async (c) => {
    if (!pool) return c.json({ error: 'not_found' }, 404)
    const id = c.req.param('id')

    const prefix = `/api/handoffs/${id}/files/`
    const raw = decodeURIComponent(new URL(c.req.url).pathname.slice(prefix.length))
    if (!raw || raw.includes('\\') || raw.split('/').some((p) => p === '..' || p === '')) {
      return c.json({ error: 'not_found' }, 404)
    }

    const { rows } = await pool
      .query('SELECT manifest FROM handoff_bundles WHERE id = $1', [id])
      .catch(() => ({ rows: [] }))
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    // Only serve paths the manifest recorded, so nothing outside the imported
    // set can be read even if it somehow exists in the directory.
    if (!rows[0].manifest.some((m: any) => m.path === raw)) return c.json({ error: 'not_found' }, 404)

    const filePath = path.join(rootDir, id, raw)
    const bundleDir = path.join(rootDir, id)
    if (!filePath.startsWith(bundleDir + path.sep)) return c.json({ error: 'not_found' }, 404)
    try {
      await fs.stat(filePath)
    } catch {
      return c.json({ error: 'gone' }, 410)
    }

    const ext = raw.split('.').pop()!.toLowerCase()
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
    return new Response(stream, {
      headers: {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        // Imported bundles are untrusted. `sandbox` drops the response into an
        // opaque origin, so a preview cannot touch this site's storage or DOM.
        'Content-Security-Policy': 'sandbox allow-scripts',
      },
    })
  })

  /** Re-read the stored README with the current parser. The bundle's files
   *  are already on disk, so improving the parser should not mean re-uploading
   *  everything that was imported before it. */
  api.post('/:id/reparse', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked
    if (!authorized(c)) return denied(c)

    const id = c.req.param('id')
    const { rows } = await pool
      .query('SELECT entrypoints FROM handoff_bundles WHERE id = $1', [id])
      .catch(() => ({ rows: [] }))
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)

    const readme = rows[0].entrypoints?.readme
    if (!readme) return c.json({ error: '이 번들에는 README가 없습니다.' }, 422)

    let spec: any
    try {
      const text = await fs.readFile(path.join(rootDir, id, readme), 'utf8')
      spec = parseHandoffSpec(text)
    } catch {
      return c.json({ error: 'README를 다시 읽지 못했습니다.' }, 410)
    }

    const updated = await pool.query(
      'UPDATE handoff_bundles SET spec = $2 WHERE id = $1 RETURNING *',
      [id, JSON.stringify(spec)]
    )
    return c.json({ handoff: rowToBundle(updated.rows[0]) })
  })

  api.delete('/:id', async (c) => {
    const blocked = requireDb(c)
    if (blocked) return blocked
    if (!authorized(c)) return denied(c)

    const id = c.req.param('id')
    const { rows } = await pool
      .query('DELETE FROM handoff_bundles WHERE id = $1 RETURNING id', [id])
      .catch(() => ({ rows: [] }))
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await fs.rm(path.join(rootDir, id), { recursive: true, force: true }).catch(() => {})
    return c.json({ deleted: id })
  })

  return api
}

function rowToBundle(row: any) {
  return {
    id: row.id,
    name: row.name,
    filename: row.filename,
    byteSize: Number(row.byte_size),
    sha256: row.sha256,
    spec: row.spec,
    entrypoints: row.entrypoints,
    createdAt: row.created_at,
    thumbnailUrl: row.entrypoints?.thumbnail
      ? `/api/handoffs/${row.id}/files/${row.entrypoints.thumbnail}`
      : null,
    logoUrl: row.entrypoints?.logo ? `/api/handoffs/${row.id}/files/${row.entrypoints.logo}` : null,
  }
}
