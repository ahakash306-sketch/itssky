// Build-only script. Runs in GitHub Actions, never in the browser.
//
// What it does, in plain terms:
//   1. Copies the whole site (as-is) into dist/.
//   2. Serves that copy on localhost, exactly like GitHub Pages would.
//   3. Opens it in a real (headless) Chromium — the same browser engine a
//      visitor's Chrome uses — and waits for the page to fully render:
//      React + ReactDOM + Babel loaded, the {{ }} template resolved, and
//      content.json applied.
//   4. Saves that fully-rendered HTML as dist/index.html, replacing the
//      version that ships with unresolved {{ }} placeholders.
//
// Nothing about support.js, cms.js, case-data.js, image-slot.js, or
// content.json is touched or reimplemented. The exact same client-side
// code still runs in every visitor's browser after this HTML loads — this
// script only makes sure real content is already painted before that
// code finishes downloading and executing, instead of a blank/placeholder
// shell.
//
// Safety net: if the page still contains an unresolved {{ ... }} anywhere
// after waiting, this script throws and exits non-zero. That fails the
// GitHub Actions run loudly (a red X), which stops the broken snapshot
// from ever being deployed — it does not fail silently.

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PORT = 4173;

// Anything in here is build-only tooling and was never part of the live
// site, so leaving it out of dist/ changes nothing about what visitors see.
const EXCLUDE = new Set([
  "node_modules",
  ".git",
  ".github",
  "dist",
  "scripts",
  "package.json",
  "package-lock.json",
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function serveDir(rootDir, port) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(rootDir, urlPath);
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

async function copyRecursive(src, dest) {
  const entries = await fsp.readdir(src, { withFileTypes: true });
  await fsp.mkdir(dest, { recursive: true });
  for (const entry of entries) {
    if (EXCLUDE.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  console.log("Copying site files into dist/ ...");
  await fsp.rm(DIST, { recursive: true, force: true });
  await copyRecursive(ROOT, DIST);

  console.log("Starting local static server ...");
  const server = await serveDir(ROOT, PORT);

  console.log("Launching headless Chromium ...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const issues = [];
  page.on("pageerror", (err) => issues.push(`pageerror: ${err}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push(`console.error: ${msg.text()}`);
  });

  console.log(`Navigating to http://localhost:${PORT}/ ...`);
  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  console.log("Waiting for the template to resolve (no more {{ }} left in the page) ...");
  await page.waitForFunction(
    () => !document.body || !document.body.innerText.includes("{{"),
    { timeout: 30000 }
  );

  // Small settle window in case content.json applies in a second pass
  // after the first template render.
  await page.waitForTimeout(800);

  const stillHasPlaceholders = await page.evaluate(() =>
    document.body.innerText.includes("{{")
  );

  if (stillHasPlaceholders) {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    throw new Error(
      "Page still contains unresolved {{ }} placeholders after waiting. " +
        "Aborting so a broken snapshot never gets deployed."
    );
  }

  console.log("Capturing fully-rendered HTML ...");
  const html = await page.content();

  await browser.close();
  await new Promise((resolve) => server.close(resolve));

  if (issues.length) {
    console.warn(
      "Non-fatal console/page errors seen during render (review if the site " +
        "looks off after deploying):"
    );
    for (const issue of issues) console.warn(" -", issue);
  }

  await fsp.writeFile(path.join(DIST, "index.html"), html, "utf-8");
  console.log(
    `Wrote pre-rendered dist/index.html (${(html.length / 1024).toFixed(1)} KB)`
  );
}

main().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
