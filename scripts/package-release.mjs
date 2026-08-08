import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const destination = path.join(root, "release");
const files = ["main.js", "manifest.json", "styles.css", "Bravura.woff2"];
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const file of files) {
    const source = path.join(root, file);
    await stat(source);
    await copyFile(source, path.join(destination, file));
}
console.log(`Release staged in ${destination}: ${files.join(", ")}`);
