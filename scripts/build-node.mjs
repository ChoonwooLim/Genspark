// Bundles the Node.js server entry (src/server.node.ts) into dist-node/server.js
// for container/Docker-based deploy paths (e.g. Orbitron) that run
// `npm run build && npm start` on a plain Node.js runtime.
//
// This is separate from the Cloudflare Pages build (`vite build`, which
// produces dist/_worker.js for the Workers runtime) so neither build affects
// the other.
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/server.node.ts'],
  outfile: 'dist-node/server.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: 'hono/jsx',
  packages: 'external',
  logLevel: 'info',
})
