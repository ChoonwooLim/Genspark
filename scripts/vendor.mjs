// Copies third-party browser bundles out of node_modules into public/static so
// the pages can load them from this origin instead of a CDN. Run after
// bumping a vendored dependency: npm run vendor
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const targets = [['jszip', 'dist/jszip.min.js', 'jszip.min.js']]

mkdirSync('public/static/vendor', { recursive: true })

for (const [pkg, from, to] of targets) {
  const { version } = JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8'))
  const dest = `public/static/vendor/${to}`
  copyFileSync(`node_modules/${pkg}/${from}`, dest)
  writeFileSync(
    dest,
    `/* ${pkg} v${version} — vendored from node_modules/${pkg}/${from}.\n` +
      ` * Served locally so the page does not depend on a third-party CDN.\n` +
      ` * Refresh with: npm i ${pkg} && npm run vendor\n */\n` +
      readFileSync(dest, 'utf8')
  )
  console.log(`vendored ${pkg}@${version} -> ${dest}`)
}
