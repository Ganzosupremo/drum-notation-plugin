import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const destination = path.join(root, "release");
const pluginId = "drum-notation-renderer";
const releaseFiles = ["main.js", "manifest.json", "styles.css"];

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

await copyFile(path.join(root, "main.js"), path.join(destination, "main.js"));
await copyFile(path.join(root, "manifest.json"), path.join(destination, "manifest.json"));

const sourceCss = await readFile(path.join(root, "styles.css"), "utf8");
const font = await readFile(path.join(root, "Bravura.woff2"));
const fontReference = /url\((['"]?)Bravura\.woff2\1\)/;
if (!fontReference.test(sourceCss)) {
    throw new Error("styles.css does not contain the expected Bravura.woff2 reference.");
}
const releaseCss = sourceCss.replace(
    fontReference,
    `url("data:font/woff2;base64,${font.toString("base64")}")`,
);
await writeFile(path.join(destination, "styles.css"), releaseCss, "utf8");

const zipEntries = [];
for (const file of releaseFiles) {
    const data = await readFile(path.join(destination, file));
    zipEntries.push({ name: `${pluginId}/${file}`, data });
}
const mobilePackage = path.join(destination, `${pluginId}-mobile.zip`);
await writeFile(mobilePackage, createStoredZip(zipEntries));

for (const file of releaseFiles) await stat(path.join(destination, file));
console.log(`Release staged in ${destination}: ${releaseFiles.join(", ")}`);
console.log(`Universal Android/iPhone/iPad package: ${mobilePackage}`);

function createStoredZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
        const name = Buffer.from(entry.name.replaceAll("\\", "/"), "utf8");
        const checksum = crc32(entry.data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(0, 8);
        local.writeUInt32LE(0, 10);
        local.writeUInt32LE(checksum, 14);
        local.writeUInt32LE(entry.data.length, 18);
        local.writeUInt32LE(entry.data.length, 22);
        local.writeUInt16LE(name.length, 26);
        local.writeUInt16LE(0, 28);
        localParts.push(local, name, entry.data);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(0, 10);
        central.writeUInt32LE(0, 12);
        central.writeUInt32LE(checksum, 16);
        central.writeUInt32LE(entry.data.length, 20);
        central.writeUInt32LE(entry.data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt16LE(0, 30);
        central.writeUInt16LE(0, 32);
        central.writeUInt16LE(0, 34);
        central.writeUInt16LE(0, 36);
        central.writeUInt32LE(0, 38);
        central.writeUInt32LE(offset, 42);
        centralParts.push(central, name);
        offset += local.length + name.length + entry.data.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);
    return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}
