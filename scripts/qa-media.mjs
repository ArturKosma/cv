/** Run npm test with Chrome/Edge installed, or set CHROME_PATH. Screenshots go to a temp directory. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = process.env.QA_ARTIFACT_DIR || join(tmpdir(), 'cv-media-qa');
const viewports = [
  { name: 'desktop-wide', width: 1440, height: 900 },
  { name: 'desktop-medium', width: 1280, height: 800 },
  { name: 'ipad-landscape', width: 1100, height: 800 },
  { name: 'ipad-portrait', width: 820, height: 1100 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'iphone-12-mini', width: 375, height: 812, isMobile: true, hasTouch: true },
];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };

async function browserPath() {
  const candidates = [process.env.CHROME_PATH, process.env.BROWSER_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  for (const candidate of candidates.filter(Boolean)) {
    try { await access(candidate); return candidate; } catch {}
  }
  throw new Error('Install Chrome/Edge or set CHROME_PATH to its executable.');
}

const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const file = path === root ? join(root, 'index.html') : path;
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404).end(); return; }
    const headers = { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    let start = 0, end = info.size - 1;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      start = Number(range[1]);
      end = range[2] ? Math.min(Number(range[2]), end) : end;
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = end - start + 1;
    res.writeHead(range ? 206 : 200, headers);
    const stream = createReadStream(file, { start, end });
    res.on('close', () => stream.destroy());
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch { res.writeHead(404).end(); }
});

const pause = ms => new Promise(r => setTimeout(r, ms));
let browser;
const errors = [];
try {
  await mkdir(artifacts, { recursive: true });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({ executablePath: await browserPath(), headless: true });
  const page = await browser.newPage();
  const videoRequests = new Set();
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('.mp4')) videoRequests.add(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  const shot = name => page.screenshot({ path: join(artifacts, `${name}.png`) });
  const playing = selector => page.waitForFunction(selector => {
    const v = document.querySelector(selector);
    return v && !v.paused && v.readyState >= 2 && v.currentTime > 0;
  }, { timeout: 15000 }, selector);
  const invariant = async label => {
    const report = await page.evaluate(() => {
      const videos = [...document.querySelectorAll('video[src]')];
      const visible = v => {
        const box = v.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
      };
      return {
        loaded: videos.length,
        invalid: videos.filter(v => !visible(v) || (!v.classList.contains('thumb-video') && !v.closest('details').open)).map(v => v.src),
        thumbs: videos.filter(v => v.classList.contains('thumb-video')).length,
        gestures: videos.filter(v => v.closest('.idle-gesture')).length,
        full: videos.filter(v => !v.classList.contains('thumb-video') && !v.closest('.idle-gesture')).length,
      };
    });
    assert.deepEqual(report.invalid, [], `${label}: invisible videos retained sources`);
    return report;
  };
  const thumbnailsKeepPlaying = async label => {
    try {
      await page.waitForFunction(() => {
        const thumbnails = [...document.querySelectorAll('.thumb-video')].filter(video => {
          const box = video.getBoundingClientRect();
          return box.bottom > 0 && box.top < innerHeight && box.width > 0 && box.height > 0;
        });
        return thumbnails.length > 0 && thumbnails.every(video => video.hasAttribute('src') && !video.paused && video.readyState >= 2);
      }, { timeout: 5000 });
      const count = await page.evaluate(() => {
        window.__qaThumbnailPlayback = [...document.querySelectorAll('.thumb-video[src]')].map(video => ({ video, time: video.currentTime }));
        return window.__qaThumbnailPlayback.length;
      });
      await page.waitForFunction(() => window.__qaThumbnailPlayback.every(({ video, time }) =>
        video.hasAttribute('src') && !video.paused && video.currentTime !== time), { timeout: 5000 });
      await page.evaluate(() => { delete window.__qaThumbnailPlayback; });
      assert.ok((await invariant(label)).full > 0, `${label}: a full-size clip must also be visible`);
      console.log(`PASS ${label}: ${count} visible miniature(s) keep advancing during full-size playback`);
    } catch (error) {
      throw new Error(`${label}: visible miniature playback stopped while a sample was open (${error.message})`);
    }
  };

  for (const viewport of viewports) {
    await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
    for (const route of ['index.html', 'reel.html', 'resume.html', 'samples.html']) {
      videoRequests.clear();
      if (route === 'resume.html' && viewport.isMobile) {
        // Headless browsers cannot display native phone PDF viewers. Capture
        // the navigation and verify the real PDF separately from its viewer.
        const pdfUrl = `${base}/resume.pdf?v=linkedin-3`;
        const pdf = await fetch(pdfUrl);
        assert.equal(pdf.status, 200, 'The phone CV PDF must be available');
        assert.equal(pdf.headers.get('content-type'), 'application/pdf');
        assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
        const navigations = [];
        const intercept = request => {
          if (request.url() === pdfUrl && request.isNavigationRequest()) {
            navigations.push(request.url());
            request.respond({ status: 200, contentType: 'text/html', body: '<title>Native PDF destination</title><link rel="icon" href="data:,">' });
          } else {
            request.continue();
          }
        };
        await page.setRequestInterception(true);
        page.on('request', intercept);
        try {
          await page.goto(`${base}/${route}`, { waitUntil: 'networkidle0' });
          assert.equal(page.url(), pdfUrl, 'Phones must go straight to the Open PDF');
          assert.deepEqual(navigations, [pdfUrl], 'The PDF must open once in the same tab');
          await page.goBack({ waitUntil: 'networkidle0' });
          assert.equal(page.url(), `${base}/reel.html`, 'Back must skip the replaced CV page');
        } finally {
          page.off('request', intercept);
          await page.setRequestInterception(false);
        }
        console.log(`PASS ${viewport.name}: CV opens the native PDF without an extra tap`);
        continue;
      }
      await page.goto(`${base}/${route}`, { waitUntil: 'networkidle0' });
      const report = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        nav: [...document.querySelectorAll('.nav-actions .btn')].map(v => ({ text: v.textContent.trim(), current: v.getAttribute('aria-current') === 'page', href: v.getAttribute('href'), color: getComputedStyle(v).color, decoration: getComputedStyle(v).textDecorationLine })),
        main: !!document.querySelector('#main'), skip: !!document.querySelector('.skip-link'),
        images: [...document.images].filter(v => v.complete && v.getAttribute('src') && !v.naturalWidth).map(v => v.src),
      }));
      assert.equal(report.overflow, false, `${viewport.name}/${route}: horizontal overflow`);
      assert.ok(report.main && report.skip, `${route}: landmarks and skip link`);
      assert.deepEqual(report.nav.map(v => v.text), ['About', 'Samples', 'Reel', 'CV']);
      assert.equal(report.nav.filter(v => v.current).length, 1);
      assert.equal(report.nav.find(v => v.current).href, null);
      assert.ok(report.nav.every(v => !v.decoration.includes('underline') && v.color !== 'rgb(0, 0, 238)'));
      assert.deepEqual(report.images, [], `${route}: broken images`);
      await shot(`${viewport.name}-${route.replace('.html', '')}-closed`);
    }
    await playing('.thumb-video[src]');
    const initialSources = await page.$$eval('.thumb-video[src]', videos => videos.map(v => v.src));
    assert.ok([...videoRequests].every(url => initialSources.includes(url)), `${viewport.name}: offscreen video downloaded on first load`);
    assert.equal(await page.$('[data-media-slot] video[src]'), null, 'Closed samples must not load full videos');
    await invariant(`${viewport.name}: initial`);
    // Match the reported regression: list miniatures above a partly visible large clip.
    await page.evaluate(() => {
      document.querySelector('.thumb-video[data-src*="/procedural-hit-reactions/"]').closest('details').open = true;
    });
    await pause(450);
    await page.evaluate(() => {
      const slot = document.querySelector('.thumb-video[data-src*="/procedural-hit-reactions/"]').closest('details').querySelector('[data-type="video"]');
      window.scrollTo(0, scrollY + slot.getBoundingClientRect().top - innerHeight + 100);
    });
    await playing('[data-src*="/procedural-hit-reactions/media-1.mp4"] video');
    await thumbnailsKeepPlaying(`${viewport.name}: expanded hit reactions`);
    await shot(`${viewport.name}-miniatures-with-expanded-sample`);
    await page.evaluate(() => {
      document.querySelector('.thumb-video[data-src*="/procedural-hit-reactions/"]').closest('details').open = false;
      window.scrollTo(0, 0);
    });
    await pause(500);
    // Native summary keyboard interaction, then all expanded layouts.
    await page.focus('details[data-project] > summary');
    await page.keyboard.press('Enter');
    await page.waitForSelector('details[data-project][open]');
    await pause(500);
    await playing('[data-media-slot] video');
    await thumbnailsKeepPlaying(`${viewport.name}: first sample`);
    await shot(`${viewport.name}-samples-open`);
    await page.evaluate(() => document.querySelectorAll('details[data-project]').forEach(d => { d.open = true; }));
    await pause(500);
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      open: document.querySelectorAll('details[data-project][open]').length,
      total: document.querySelectorAll('details[data-project]').length,
      clipped: [...document.querySelectorAll('.project-detail')].filter(el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1).length,
      frames: [...document.querySelectorAll('[data-type="video"] [data-media-frame]')].every(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0),
    }));
    assert.equal(layout.overflow, false, `${viewport.name}: expanded overflow`);
    assert.equal(layout.open, layout.total, 'Samples must allow multiple open projects');
    assert.equal(layout.clipped, 0, `${viewport.name}: clipped sample text`);
    assert.ok(layout.frames, `${viewport.name}: empty media frames`);
    await page.evaluate(() => document.querySelectorAll('details[data-project]').forEach(d => { d.open = false; }));
    await pause(500);
    assert.equal(await page.$('[data-media-slot] video'), null, 'Collapse must remove full videos');
    console.log(`PASS layout, keyboard, expand/collapse: ${viewport.name}`);
  }

  // Browse every clip with projects left open: resources must stay bounded by visibility.
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto(`${base}/samples.html`, { waitUntil: 'networkidle0' });
  const slots = await page.$$eval('[data-media-slot][data-type="video"]', slots => slots.map((s, i) => { s.dataset.qaSlot = i; return i; }));
  let maximumLoaded = 0;
  let maximumFull = 0;
  for (const id of slots) {
    await page.evaluate(id => {
      window.__oldVideos = [...document.querySelectorAll('[data-media-slot] video')];
      const slot = document.querySelector(`[data-qa-slot="${id}"]`);
      slot.closest('details').open = true;
    }, id);
    await pause(450);
    await page.evaluate(id => document.querySelector(`[data-qa-slot="${id}"]`).scrollIntoView({ block: 'center', behavior: 'instant' }), id);
    await playing(`[data-qa-slot="${id}"] video`);
    await pause(100);
    const report = await invariant(`clip ${id}`);
    maximumLoaded = Math.max(maximumLoaded, report.loaded);
    maximumFull = Math.max(maximumFull, report.full);
    assert.ok(report.full <= 3, `clip ${id}: unexpected simultaneous full-size streams: ${report.full}`);
    assert.ok(report.gestures <= 3, `clip ${id}: unexpected simultaneous gesture previews: ${report.gestures}`);
    assert.ok(await page.evaluate(() => window.__oldVideos.filter(v => !v.isConnected).every(v => !v.hasAttribute('src') && v.readyState === 0 && v.buffered.length === 0)), 'Detached videos must release their buffers');
    if (id === slots[0] || id === slots.at(-1)) await shot(`iphone-12-mini-clip-${id}`);
  }
  console.log(`PASS browsing all ${slots.length} clips; maximum ${maximumFull} full-size streams, ${maximumLoaded} total streams including visible miniatures`);

  // Scroll back: clips must reload and play again, and page lifecycle must release them.
  await page.evaluate(() => document.querySelector('[data-qa-slot="0"]').scrollIntoView({ block: 'center' }));
  await playing('[data-qa-slot="0"] video');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal(await page.$$eval('video[src]', videos => videos.length), 0, 'pagehide must release every source');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await playing('[data-qa-slot="0"] video');
  // The visibility property is overridden only in this test to simulate tab switching.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await page.$$eval('video[src]', videos => videos.length), 0, 'Hidden tab must release every source');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await playing('[data-qa-slot="0"] video');
  console.log('PASS offscreen resume, hidden tab, and page lifecycle');

  // Enlarged image remains accessible and suspends background video playback.
  await page.evaluate(() => { const slot = document.querySelector('[data-enlarge]'); slot.closest('details').open = true; });
  await pause(500);
  await page.evaluate(() => document.querySelector('.media-slot__enlarge').scrollIntoView({ block: 'center' }));
  await page.click('.media-slot__enlarge');
  await page.waitForSelector('.image-viewer[open]');
  assert.equal(await page.$$eval('video[src]', videos => videos.length), 0, 'Image dialog must suspend video playback');
  await page.click('[data-viewer-zoom]');
  assert.ok(await page.$('.image-viewer--actual-size'));
  await shot('iphone-12-mini-image-viewer');
  await page.keyboard.press('Escape');
  assert.equal(await page.$('.image-viewer[open]'), null);
  assert.ok(await page.evaluate(() => document.activeElement.matches('.media-slot__enlarge')));
  await invariant('image viewer closed');
  console.log('PASS image viewer, zoom, Escape, and focus restoration');

  // Rapid expand/collapse catches aborted play promises and stale frame callbacks.
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => { const d = document.querySelector('details[data-project]'); d.open = true; d.scrollIntoView(); });
    await pause(35);
    await page.evaluate(() => { document.querySelector('details[data-project]').open = false; });
    await pause(35);
  }
  await page.evaluate(() => document.querySelectorAll('details[data-project]').forEach(d => { d.open = false; }));
  await pause(600);
  assert.equal(await page.$('[data-media-slot] video'), null);
  await invariant('rapid toggle');
  await page.evaluate(() => { const d = document.querySelector('details[data-project]'); d.open = true; });
  await pause(450);
  await page.evaluate(() => document.querySelector('[data-media-slot]').scrollIntoView({ block: 'center' }));
  await playing('[data-media-slot] video');
  console.log('PASS 20 rapid expand/collapse cycles and playback afterward');

  // Fallback still manages resources if IntersectionObserver is unavailable.
  const fallback = await browser.newPage();
  fallback.on('pageerror', error => errors.push(error.message));
  await fallback.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await fallback.evaluateOnNewDocument(() => { delete window.IntersectionObserver; });
  await fallback.goto(`${base}/samples.html`, { waitUntil: 'networkidle0' });
  await fallback.waitForFunction(() => [...document.querySelectorAll('.thumb-video')].some(v => !v.paused && v.readyState >= 2));
  await fallback.evaluate(() => { const d = document.querySelector('details[data-project]'); d.open = true; });
  await pause(500);
  await fallback.evaluate(() => document.querySelector('[data-media-slot]').scrollIntoView({ block: 'center' }));
  await fallback.waitForFunction(() => { const v = document.querySelector('[data-media-slot] video'); return v && !v.paused && v.readyState >= 2; });
  await fallback.evaluate(() => { document.querySelector('details[data-project]').open = false; });
  await pause(500);
  assert.equal(await fallback.$('[data-media-slot] video'), null);
  await fallback.close();
  // Exercise loadeddata poster cleanup on browsers without video frame callbacks.
  const legacy = await browser.newPage();
  legacy.on('pageerror', error => errors.push(error.message));
  await legacy.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await legacy.evaluateOnNewDocument(() => { delete HTMLVideoElement.prototype.requestVideoFrameCallback; delete HTMLVideoElement.prototype.cancelVideoFrameCallback; });
  await legacy.goto(`${base}/samples.html`, { waitUntil: 'networkidle0' });
  await legacy.evaluate(() => { document.querySelector('details[data-project]').open = true; });
  await pause(500);
  await legacy.evaluate(() => document.querySelector('[data-media-slot]').scrollIntoView({ block: 'center' }));
  await legacy.waitForFunction(() => { const v = document.querySelector('[data-media-slot] video'); return v && !v.paused && v.readyState >= 2 && !document.querySelector('[data-media-slot] .media-slot__poster'); });
  await legacy.evaluate(() => { document.querySelector('details[data-project]').open = false; });
  await pause(500);
  assert.equal(await legacy.$('[data-media-slot] video'), null);
  await legacy.close();
  assert.deepEqual(errors, [], 'Browser errors or missing assets');
  console.log(`PASS fallback and no browser errors. Screenshots: ${artifacts}`);
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(r => server.close(r));
}
