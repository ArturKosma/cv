import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

// Keep a tiny first frame in the HTML; full-size posters load on expansion.
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const htmlPath = path.join(root, "samples.html");
const html = fs.readFileSync(htmlPath, "utf8");
const previewPattern = /(<div\s+class="media-slot"[\s\S]*?<img\s+class="media-slot__poster"\s+src=")([^"]+)(")/g;
const previews = [...html.matchAll(previewPattern)].map((match) => {
  const poster = match[1].match(/data-poster="([^"]+)"/);
  if (!poster) throw new Error("Preview is missing data-poster");
  const file = path.resolve(root, poster[1].split("?")[0]);
  if (!file.startsWith(root + path.sep)) throw new Error("Poster must be inside the repository");
  return { poster: poster[1], data: fs.readFileSync(file).toString("base64") };
});
if (!previews.length) throw new Error("No media previews found");

const executablePath = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error("Set CHROME_PATH to Chrome or Edge");

const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage();
  const inline = await page.evaluate(async (items) => {
    const result = [];
    for (const item of items) {
      const image = new Image();
      image.src = "data:image/webp;base64," + item.data;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = Math.round(canvas.width * image.naturalHeight / image.naturalWidth);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      result.push(canvas.toDataURL("image/webp", 0.55));
    }
    return result;
  }, previews);
  let index = 0;
  const updated = html.replace(previewPattern, (_, prefix, oldSrc, suffix) => prefix + inline[index++] + suffix);
  fs.writeFileSync(htmlPath, updated, "utf8");
  const bytes = inline.reduce((total, data) => total + Buffer.byteLength(data), 0);
  console.log("Updated " + inline.length + " inline first frames (" + bytes + " bytes total in HTML)");
} finally {
  await browser.close();
}
