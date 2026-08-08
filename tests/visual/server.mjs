import esbuild from "esbuild";
import { createServer } from "node:http";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, ".visual-test");
await mkdir(output, { recursive: true });
await esbuild.build({
    absWorkingDir: root,
    entryPoints: [path.join(root, "tests", "visual", "fixture.ts")],
    outfile: path.join(output, "fixture.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
});
await copyFile(path.join(root, "styles.css"), path.join(output, "styles.css"));
await copyFile(path.join(root, "Bravura.woff2"), path.join(output, "Bravura.woff2"));
await writeFile(path.join(output, "index.html"), `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="/styles.css"><style>
:root{font-family:system-ui,sans-serif}.theme-light{--background-primary:#fff;--background-secondary:#eee;--text-normal:#222;--text-muted:#666;--text-error:#b42318;--text-warning:#9a6700}.theme-dark{--background-primary:#202020;--background-secondary:#292929;--text-normal:#eee;--text-muted:#aaa;--text-error:#ff8585;--text-warning:#f0b849}body{margin:0;padding:16px;background:var(--background-primary);color:var(--text-normal)}section{margin:0 0 28px}.visual-host{width:100%}h2{font-size:15px;margin:0 0 6px}
</style></head><body><main id="app"></main><script src="/fixture.js"></script></body></html>`);

const contentTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const file = pathname === "/" ? "index.html" : pathname.slice(1);
    try {
        const body = await readFile(path.join(output, file));
        response.writeHead(200, { "Content-Type": contentTypes[path.extname(file)] ?? "application/octet-stream" });
        response.end(body);
    } catch {
        response.writeHead(404).end("Not found");
    }
});
server.listen(4173, "127.0.0.1");
process.on("SIGTERM", () => server.close());
