// Shared Node-only storage plumbing: where Postgres lives and where uploaded
// files go. Imported by sequences.node.ts and logos.node.ts so both agree on
// the connection lookup order and the upload directory, and so a database that
// is down degrades the same way in both.
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

/** Resolve the Postgres URL. Orbitron injects secrets as files (other projects
 *  on the box get DATABASE_URL_FILE), so that form is the primary path; the
 *  plain env var covers local runs and the on-volume file lets the database be
 *  attached without waiting for an env-var redeploy. */
export async function resolveDatabaseUrl(uploadDir: string): Promise<string | null> {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim()

  const fromFile = process.env.DATABASE_URL_FILE
  if (fromFile) {
    try {
      return (await fs.readFile(fromFile, 'utf8')).trim()
    } catch {
      console.warn(`[storage] DATABASE_URL_FILE set but unreadable: ${fromFile}`)
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

export async function resolveUploadDir(): Promise<string> {
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

/** Connect and apply `schema`, returning null instead of throwing when the
 *  database is missing or unreachable. Callers degrade; the site stays up. */
export async function createPool(label: string, databaseUrl: string | null, schema: string) {
  if (!databaseUrl) return null
  try {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 4,
      connectionTimeoutMillis: 8000,
    })
    // node-postgres emits on idle clients dropped by the server; an unhandled
    // 'error' event would take the process down.
    pool.on('error', (err: Error) => console.error(`[${label}] idle client error:`, err.message))
    await pool.query(schema)
    return pool
  } catch (err) {
    console.error(
      `[${label}] postgres unavailable — falling back to disabled:`,
      err instanceof Error ? err.message : err
    )
    return null
  }
}

/** Client-supplied ids end up in filenames, so allow only a safe alphabet
 *  rather than trusting path.resolve to catch every traversal shape. */
export function isSafeId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)
}
