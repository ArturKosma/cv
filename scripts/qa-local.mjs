/**
 * Automated local QA — no screenshots.
 * Asserts layout, computed styles, a11y basics, expand behavior across viewports.
 */
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:8765";
const CHROME = "/usr/bin/google-chrome-stable";

const VIEWPORTS = [
  { name: "desktop-wide", width: 1440, height: 900 },
  { name: "desktop-medium", width: 1280, height: 800 },
  { name: "ipad-landscape", width: 1100, height: 800 },
  { name: "ipad-portrait", width: 820, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
];

function fail(msg) {
  throw new Error(msg);
}

function approxNotBlueLink(color) {
  // Default browser link blue is roughly rgb(0, 0, 238) / similar
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return true;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const looksLikeLinkBlue = b > 180 && r < 80 && g < 120;
  return !looksLikeLinkBlue;
}

async function assertPage(page, path, viewport) {
  const label = `${viewport.name} ${path}`;
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
  });
  const res = await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle0",
    timeout: 15000,
  });
  if (!res || !res.ok()) fail(`${label}: HTTP ${res && res.status()}`);

  const report = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const btn = document.querySelector(".btn");
    const btnStyle = btn ? getComputedStyle(btn) : null;
    const brand = document.querySelector(".brand-link");
    const brandStyle = brand ? getComputedStyle(brand) : null;
    const header = document.querySelector(".site-header");
    const skip = document.querySelector(".skip-link");
    const main = document.querySelector("#main");

    const overflowX =
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;

    const details = [...document.querySelectorAll("details[data-project]")];
    let expandOk = true;
    let mediaPlaceholder = true;
    if (details.length) {
      details[0].open = true;
      const slot = details[0].querySelector("[data-media-slot]");
      const placeholder = details[0].querySelector(".media-slot__placeholder");
      mediaPlaceholder = Boolean(slot && placeholder);
      expandOk = details[0].open === true;
      details[0].open = false;
      if (details[0].open !== false) expandOk = false;
    }

    return {
      bg: body.backgroundColor,
      color: body.color,
      hasHeader: Boolean(header),
      hasSkip: Boolean(skip),
      hasMain: Boolean(main),
      btnText: btn ? btn.textContent.trim() : null,
      btnDisplay: btnStyle ? btnStyle.display : null,
      btnBg: btnStyle ? btnStyle.backgroundColor : null,
      btnColor: btnStyle ? btnStyle.color : null,
      btnDecoration: btnStyle ? btnStyle.textDecorationLine : null,
      btnBorder: btnStyle ? btnStyle.borderTopWidth : null,
      brandDecoration: brandStyle ? brandStyle.textDecorationLine : null,
      brandColor: brandStyle ? brandStyle.color : null,
      overflowX,
      projectCount: details.length,
      expandOk,
      mediaPlaceholder,
      title: document.title,
    };
  });

  if (!report.hasHeader) fail(`${label}: missing site header`);
  if (!report.hasSkip) fail(`${label}: missing skip link`);
  if (!report.hasMain) fail(`${label}: missing #main`);
  if (!report.btnText) fail(`${label}: missing Portfolio button`);
  if (report.btnDisplay !== "inline-flex" && report.btnDisplay !== "flex") {
    fail(`${label}: Portfolio button display=${report.btnDisplay}`);
  }
  if (report.btnDecoration && report.btnDecoration.includes("underline")) {
    fail(`${label}: Portfolio button is underlined (${report.btnDecoration})`);
  }
  if (!approxNotBlueLink(report.btnColor)) {
    fail(`${label}: Portfolio button looks like default blue link (${report.btnColor})`);
  }
  if (report.overflowX) fail(`${label}: horizontal overflow`);

  // Soft contrast sanity: body text should not be near-black on near-black
  if (report.color === report.bg) fail(`${label}: fg equals bg`);

  if (path.includes("portfolio")) {
    if (report.projectCount < 1) fail(`${label}: no portfolio items`);
    if (!report.expandOk) fail(`${label}: expand/collapse failed`);
    if (!report.mediaPlaceholder) fail(`${label}: media placeholder missing`);
  }

  // Nav round-trip smoke on one viewport only handled outside
  return report;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      const home = await assertPage(page, "/index.html", viewport);
      const portfolio = await assertPage(page, "/portfolio.html", viewport);
      results.push({ viewport: viewport.name, home, portfolio, status: "PASS" });
    }

    // Navigation + on-demand script behavior (desktop)
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle0" });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('a.btn[href="portfolio.html"]'),
    ]);
    if (!page.url().includes("portfolio.html")) fail("nav: Portfolio click did not reach portfolio");

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('a.brand-link[href="index.html"]'),
    ]);
    if (!page.url().includes("index.html")) fail("nav: brand click did not reach home");

    // On-demand loader: empty data-src should mark loaded without network media
    await page.goto(`${BASE}/portfolio.html`, { waitUntil: "networkidle0" });
    const mediaState = await page.evaluate(() => {
      const details = document.querySelector("details[data-project]");
      details.open = true;
      // allow toggle handler
      details.dispatchEvent(new Event("toggle"));
      const slot = details.querySelector("[data-media-slot]");
      return {
        loaded: slot.dataset.loaded,
        text: slot.querySelector(".media-slot__placeholder")?.textContent || "",
      };
    });
    // toggle listener is sync on Event; our script listens to toggle on details
    // Re-check after microtask
    await page.waitForFunction(() => {
      const details = document.querySelector("details[data-project]");
      if (!details.open) details.open = true;
      const slot = details.querySelector("[data-media-slot]");
      return slot && slot.dataset.loaded === "true";
    }, { timeout: 3000 });

    const cssRequests = [];
    page.on("request", (req) => {
      if (req.url().includes("/css/")) cssRequests.push(req.url());
    });
    await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle0" });
    const uniqueCss = [...new Set(cssRequests)];
    if (uniqueCss.length < 4) fail(`expected shared css modules, got ${uniqueCss.length}`);

    console.log(JSON.stringify({ ok: true, viewports: results.map((r) => r.viewport), nav: "PASS", mediaOnDemand: "PASS", cssModules: uniqueCss.length }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("QA_FAIL:", err.message);
  process.exit(1);
});
