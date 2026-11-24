import { defineConfig, normalizePath } from 'vite';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
export default defineConfig({
  plugins: [{ name: 'assets', configureServer(s) { s.middlewares.use((q, _r, n) => { if (/^\/(data|audio|assets)\//.test(q.url ?? '')) q.url = `/@fs/${encodeURI(normalizePath(root))}${q.url}`; n(); }); } }],
  // /mnt/d trên WSL không có inotify: phải poll, nếu không vite phục vụ bản cũ của file đã sửa
  // PDOOM_FREEZE=1 (server chỉ để render bản chính thức): tắt hẳn watcher, không bao giờ reload giữa chừng
  server: { hmr: process.env.PDOOM_NO_HMR ? false : undefined, fs: { allow: [root] }, watch: process.env.PDOOM_FREEZE ? null : { usePolling: true, interval: 300 } },
});
