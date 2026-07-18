import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
const root = process.cwd();
const dist = path.resolve(root, "dist");
const port = Number(process.argv[2] || process.env.PORT || 3000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function resolveRequest(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const normalized = path.posix.normalize(pathname).replace(/^\/+/, "");
  const candidates = normalized
    ? [normalized, `${normalized}.html`, path.posix.join(normalized, "index.html")]
    : ["index.html"];

  for (const candidate of candidates) {
    const absolute = path.resolve(dist, candidate);
    if (!absolute.startsWith(dist + path.sep)) continue;
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
  }
  return null;
}

const server = http.createServer((request, response) => {
  const file = resolveRequest(request.url || "/");

  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("找不到頁面");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(file).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  fs.createReadStream(file).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Ebook preview ready at http://127.0.0.1:${port}`);
});
