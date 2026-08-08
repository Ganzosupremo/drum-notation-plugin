import { parseDrumDocument } from "../../src/notation/parseDocument";
import { renderDrumDocument } from "../../src/renderer/renderDocument";

type ObsidianElement = HTMLElement & {
    createDiv(): HTMLDivElement;
    setCssProps(values: Record<string, string>): void;
};

(HTMLElement.prototype as ObsidianElement).createDiv = function createDiv() {
    const child = document.createElement("div");
    this.appendChild(child);
    return child;
};
(HTMLElement.prototype as ObsidianElement).setCssProps = function setCssProps(values) {
    Object.entries(values).forEach(([key, value]) => this.style.setProperty(key, value));
};

const cases = [
    { title: "Standard · shared voices", scale: 0.8, source: "4/4\nH: 8ths >1 >3 o4&\nS: 2 4 (3a)\nK: 1 2& 3" },
    { title: "Compact · full kit", scale: 1, source: "4/4\nstyle: compact\nC: 1\nCH: 2\nSP: 3\nR: 8ths b1 b3\nT1: 1&\nT2: 2&\nT3: 3&\nS: cs1 rs2 f3 d3a rr4\nK: 1 3\nP: 2 4" },
    { title: "Practice · dense grid", scale: 1.5, source: "4/4\nstyle: practice\ngrid: 16\nHH | x . x . x . x o x . x . x . x . |\nSD | . . . . o . . . . . . . >o . (o) . |\nBD | o . . . . . o . o . . . . o . . |" },
    { title: "Meters and multiple systems", scale: 1, source: "5/4\ngrouping: 3+2\nH: 8ths | 8ths | 8ths | 8ths | 8ths\nS: 2 4 | 2 4 | 2 4 | 2 4 | 2 4\nK: 1 3 5 | % | % | % | %" },
    { title: "Compound 6/8", scale: 1, source: "6/8\nH: tri\nS: 1a 2a\nK: 1 2&" },
    { title: "Compound 9/8", scale: 1, source: "9/8\nH: tri\nS: 1a 2a 3a\nK: 1 2 3" },
    { title: "Compound 12/8", scale: 1, source: "12/8\nH: tri\nS: 2 4\nK: 1 3" },
    { title: "Diagnostics", scale: 1, source: "4/4\nS: cs1 rs1 2 4\nH: b1" },
];

const theme = new URLSearchParams(location.search).get("theme") === "dark" ? "theme-dark" : "theme-light";
document.body.className = theme;
const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Visual fixture root is missing");

cases.forEach(item => {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = item.title;
    const host = document.createElement("div") as ObsidianElement;
    host.className = "visual-host";
    section.append(heading, host);
    app.appendChild(section);
    renderDrumDocument(parseDrumDocument(item.source), host, { scale: item.scale });
});

void document.fonts.ready.then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
        document.documentElement.dataset.ready = "true";
    }));
});
