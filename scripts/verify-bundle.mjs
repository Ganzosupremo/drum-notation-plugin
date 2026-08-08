import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const bundle = path.join(root, "main.js");
const { size } = await stat(bundle);
const limit = 250 * 1024;
if (size >= limit) throw new Error(`main.js is ${size} bytes; limit is ${limit} bytes.`);
const source = await readFile(bundle, "utf8");
const forbidden = ["glyphnames.json", "glyphsWithAnchors.json", "classes.json", "ranges.json"];
const included = forbidden.filter(name => source.includes(name));
if (included.length > 0) throw new Error(`SMuFL catalogues leaked into main.js: ${included.join(", ")}`);
console.log(`Bundle verified: ${size} bytes (${(size / 1024).toFixed(1)} KiB), font excluded.`);
