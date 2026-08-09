import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
    for (const width of [360, 768, 1200]) {
        test(`${theme} gallery at ${width}px has no SVG clipping`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(`/?theme=${theme}`);
            await page.locator("html[data-ready=true]").waitFor();
            const violations = await page.locator("svg.drum-svg").evaluateAll(svgElements => svgElements.flatMap((element, index) => {
                const svg = element as SVGSVGElement;
                const viewBox = svg.viewBox.baseVal;
                const graphics = Array.from(svg.children).filter(child => child instanceof SVGGraphicsElement) as SVGGraphicsElement[];
                const boxes = graphics.map(child => child.getBBox()).filter(box => Number.isFinite(box.x));
                if (boxes.length === 0) return [`svg ${index}: empty`];
                const left = Math.min(...boxes.map(box => box.x));
                const top = Math.min(...boxes.map(box => box.y));
                const right = Math.max(...boxes.map(box => box.x + box.width));
                const bottom = Math.max(...boxes.map(box => box.y + box.height));
                const tolerance = 6;
                const failures: string[] = [];
                if (left < viewBox.x - tolerance || top < viewBox.y - tolerance || right > viewBox.x + viewBox.width + tolerance || bottom > viewBox.y + viewBox.height + tolerance) failures.push(`svg ${index}: bbox=${left.toFixed(1)},${top.toFixed(1)},${right.toFixed(1)},${bottom.toFixed(1)} viewBox=${viewBox.x},${viewBox.y},${viewBox.width},${viewBox.height}`);
                if (svg.querySelectorAll(".drum-bar").length / 2 > 4) failures.push(`svg ${index}: more than four measures`);
                const countBoxes = Array.from(svg.querySelectorAll<SVGGraphicsElement>(".drum-subdivision")).map(element => element.getBBox());
                const notationScale = Number.parseFloat(getComputedStyle(svg.parentElement!).getPropertyValue("--drum-notation-scale")) || 1;
                const accentBoxes = Array.from(svg.querySelectorAll<SVGTextElement>(".drum-glyph-accent")).map(element => {
                    const x = Number(element.getAttribute("x"));
                    const baseline = Number(element.getAttribute("y"));
                    return { x: x - 7 * notationScale, y: baseline - 10 * notationScale, width: 14 * notationScale, height: 10 * notationScale };
                });
                const openBoxes = Array.from(svg.querySelectorAll<SVGGraphicsElement>(".drum-open-marker")).map(element => element.getBBox());
                const decorationBoxes = [...accentBoxes, ...openBoxes];
                const decorationOverlap = countBoxes.flatMap(count => decorationBoxes.map(decoration => ({ count, decoration }))).find(({ count, decoration }) =>
                    count.x < decoration.x + decoration.width + 2
                    && count.x + count.width > decoration.x - 2
                    && count.y < decoration.y + decoration.height + 2
                    && count.y + count.height > decoration.y - 2);
                if (decorationOverlap) failures.push(`svg ${index}: subdivision count overlaps an accent or open marker`);
                return failures;
            }));
            expect(violations).toEqual([]);
            await expect(page).toHaveScreenshot(`gallery-${theme}-${width}.png`, { fullPage: true, animations: "disabled" });
        });
    }
}
