import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

// Run after adding or replacing a video: node scripts/generate-video-posters.mjs
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const html = fs.readFileSync(path.join(root, "samples.html"), "utf8");
const sources = [...new Set([...html.matchAll(/(?:data-src|src)="([^"]+\.mp4(?:\?[^"]*)?)"/g)].map((match) => match[1].split("?")[0]))];
if (!sources.length) throw new Error("No sample videos found");
const items = sources.map((src) => {
  const file = path.resolve(root, src);
  if (!file.startsWith(root + path.sep)) throw new Error("Video must be inside the repository");
  const poster = src.replace(/media-1\.mp4$/, "poster.webp").replace(/media-(\d+)\.mp4$/, "poster-$1.webp").replace(/thumb\.mp4$/, "thumb.webp");
  if (poster === src) throw new Error("Unexpected video filename: " + src);
  return { src, poster, bytes: fs.readFileSync(file) };
});
const videos = new Map(items.map((item) => ["/" + item.src, item.bytes]));
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/") { response.writeHead(200, { "Content-Type": "text/html" }).end("<!doctype html><title>Poster generation</title>"); return; }
  const bytes = videos.get(pathname);
  if (!bytes) { response.writeHead(404).end(); return; }
  response.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": bytes.length });
  response.end(bytes);
});
const executablePath = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error("Set CHROME_PATH to Chrome or Edge");
let browser;
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  browser = await puppeteer.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:" + server.address().port + "/");
  for (const item of items) {
    const result = await page.evaluate(async (src) => {
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "auto";
      const ready = new Promise((resolve, reject) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        video.addEventListener("error", () => reject(new Error("Cannot decode " + src)), { once: true });
      });
      video.src = src;
      await ready;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const data = canvas.toDataURL("image/webp", 0.85).split(",")[1];
      const firstFrameTime = video.currentTime;
      video.removeAttribute("src"); video.load();
      return { data, firstFrameTime };
    }, item.src);
    if (result.firstFrameTime !== 0) throw new Error("Expected the first video frame");
    fs.writeFileSync(path.join(root, item.poster), Buffer.from(result.data, "base64"));
    console.log("Generated first frame: " + item.poster);
  }
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise((resolve) => server.close(resolve));
}
