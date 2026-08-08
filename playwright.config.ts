import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/visual",
    snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
    use: {
        baseURL: "http://127.0.0.1:4173",
        browserName: "chromium",
        colorScheme: "light",
    },
    webServer: {
        command: "node tests/visual/server.mjs",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
    },
});
