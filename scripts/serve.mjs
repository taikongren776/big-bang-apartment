import http from 'node:http';
import { readFile } from 'node:fs/promises';
const html = new URL('../index.html', import.meta.url);
const server = http.createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404); res.end(); return; }
  try { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(await readFile(html)); }
  catch { res.writeHead(500); res.end('Run npm run build first.'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
