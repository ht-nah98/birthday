import { defineConfig, normalizePath } from 'vite';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
export default defineConfig({
  plugins: [{ name: 'assets', configureServer(s) { s.middlewares.use((q, _r, n) => { if (/^\/(data|audio|assets)\//.test(q.url ?? '')) q.url = `/@fs/${encodeURI(normalizePath(root))}${q.url}`; n(); }); } }],
  server: { hmr: process.env.PDOOM_NO_HMR ? false : undefined, fs: { allow: [root] } },
});
