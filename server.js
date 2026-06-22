const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const DOCS_DIR = path.join(__dirname, 'docs');

const MIME = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(DOCS_DIR, urlPath);

  if (!filePath.startsWith(DOCS_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`ProcessBrain dashboard running at http://localhost:${PORT}`);
  console.log('Run "node index.js dashboard" first to regenerate data from processes.');
});
