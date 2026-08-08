import { DrumDocument } from "../types";

function htmlChild<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, className?: string): HTMLElementTagNameMap[K] {
    // Tests provide a minimal DOM without Obsidian's activeDocument export.
    // eslint-disable-next-line obsidianmd/prefer-active-doc
    const element = document.createElementNS("http://www.w3.org/1999/xhtml", tag) as unknown as HTMLElementTagNameMap[K];
    if (className) {
        element.className = className;
        element.classList.add(...className.split(/\s+/));
    }
    parent.appendChild(element);
    return element;
}

export function renderDiagnostics(documentModel: DrumDocument, wrapper: HTMLElement): void {
    if (documentModel.diagnostics.length === 0) return;
    const panel = htmlChild(wrapper, "div", "drum-diagnostics");
    const ordered = [...documentModel.diagnostics].sort((left, right) => left.severity === right.severity ? 0 : left.severity === "error" ? -1 : 1);
    ordered.forEach((item, index) => {
        const details = htmlChild(panel, "details", `drum-diagnostic drum-diagnostic-${item.severity}`);
        details.open = index === 0;
        const summary = htmlChild(details, "summary", "drum-diagnostic-summary");
        const context = [item.instrument, item.measure ? `measure ${item.measure}` : undefined].filter(Boolean).join(" · ");
        summary.textContent = `${item.severity === "error" ? "Error" : "Warning"} · ${item.code}${context ? ` · ${context}` : ""}`;
        htmlChild(details, "div", "drum-diagnostic-message").textContent = item.message;
        const source = item.location.source === "fence-header" ? documentModel.headerText ?? "" : documentModel.sourceText;
        const sourceLine = source.split(/\r?\n/)[Math.max(0, item.location.line - 1)];
        if (sourceLine !== undefined) {
            const frame = htmlChild(details, "pre", "drum-diagnostic-frame");
            const start = Math.max(0, item.location.column - 1);
            const end = Math.max(item.location.column, (item.location.endColumn ?? item.location.column + 1) - 1);
            htmlChild(frame, "span").textContent = sourceLine.slice(0, start);
            const mark = htmlChild(frame, "mark", "drum-diagnostic-highlight");
            mark.textContent = sourceLine.slice(start, end) || " ";
            htmlChild(frame, "span").textContent = sourceLine.slice(end);
        }
        if (item.suggestion) htmlChild(details, "div", "drum-diagnostic-suggestion").textContent = item.suggestion;
        item.fixes?.forEach(fix => {
            const button = htmlChild(details, "button", "drum-diagnostic-copy");
            button.type = "button";
            button.textContent = fix.title;
            button.addEventListener("click", () => {
                const lines = documentModel.sourceText.split(/\r?\n/);
                const line = lines[fix.range.line - 1] ?? "";
                lines[fix.range.line - 1] = line.slice(0, fix.range.column - 1)
                    + fix.replacement
                    + line.slice((fix.range.endColumn ?? fix.range.column + 1) - 1);
                void navigator.clipboard.writeText(lines.join("\n")).then(() => {
                    button.textContent = "Copied";
                }).catch(() => { button.textContent = "Copy failed"; });
            });
        });
    });
}
