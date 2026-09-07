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
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return true;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return !(b > 180 && r < 80 && g < 120);
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
  if (!res || !(res.ok() || res.status() === 304)) fail(`${label}: HTTP ${res && res.status()}`);

  const report = await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".nav-actions .btn")].map((el) => ({
      text: el.textContent.trim(),
      href: el.getAttribute("href"),
      display: getComputedStyle(el).display,
      color: getComputedStyle(el).color,
      decoration: getComputedStyle(el).textDecorationLine,
    }));
    const brand = document.querySelector(".brand-link");
    const heroTitle = document.querySelector(".hero-title");
    const eyebrow = document.querySelector(".eyebrow");
    const lede = document.querySelector(".lede")?.textContent.trim() || "";
    const overflowX =
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;

    const experience = document.querySelector(".experience");
    const identity = document.querySelector(".identity");
    const portrait = document.querySelector(".portrait-frame");
    const timelineItems = document.querySelectorAll(".timeline-item").length;
    let homeSplit = true;
    if (experience && identity && window.innerWidth > 900) {
      const e = experience.getBoundingClientRect();
      const i = identity.getBoundingClientRect();
      homeSplit = e.left < i.left && i.right > window.innerWidth * 0.45;
    }

    const details = [...document.querySelectorAll("details[data-project]")];
    let expandOk = true;
    let layoutOk = true;
    let blurbStays = true;
    let noExtraDetail = true;
    if (details.length) {
      details[0].open = true;
      const body = details[0].querySelector(".project-body");
      const detail = details[0].querySelector(".project-detail");
      const media = details[0].querySelector(".media-slot");
      const blurb = details[0].querySelector(".project-blurb");
      const blurbVisible = blurb && getComputedStyle(blurb).display !== "none";
      layoutOk = Boolean(body && media);
      blurbStays = Boolean(blurbVisible);
      noExtraDetail = !detail;
      expandOk = details[0].open === true;
      details[0].open = false;
      if (details[0].open !== false) expandOk = false;
    }

    const nav = document.querySelector(".nav-actions");
    const navBox = nav ? nav.getBoundingClientRect() : null;
    const navPinnedRight =
      Boolean(navBox) && navBox.right >= window.innerWidth - 48 && navBox.left > window.innerWidth * 0.4;

    return {
      btnCount: btns.length,
      btns,
      hasBrand: Boolean(brand),
      hasHeroTitle: Boolean(heroTitle),
      hasEyebrow: Boolean(eyebrow),
      lede,
      overflowX,
      homeSplit,
      hasExperience: Boolean(experience),
      hasIdentity: Boolean(identity),
      hasPortrait: Boolean(portrait),
      timelineItems,
      navPinnedRight,
      projectCount: details.length,
      expandOk,
      layoutOk,
      blurbStays,
      noExtraDetail,
      hasSkip: Boolean(document.querySelector(".skip-link")),
      hasMain: Boolean(document.querySelector("#main")),
    };
  });

  if (!report.hasSkip) fail(`${label}: missing skip link`);
  if (!report.hasMain) fail(`${label}: missing #main`);
  if (report.hasBrand) fail(`${label}: brand link should be removed`);
  if (report.btnCount < 2) fail(`${label}: expected Home + Portfolio buttons`);
  if (report.btns[0].text !== "Home") fail(`${label}: Home should be leftmost nav button`);
  if (report.btns[1].text !== "Portfolio") fail(`${label}: Portfolio should follow Home`);
  if (!report.navPinnedRight) fail(`${label}: nav buttons must be pinned top-right`);
  for (const btn of report.btns) {
    if (!btn.display.includes("flex")) fail(`${label}: ${btn.text} display=${btn.display}`);
    if (btn.decoration.includes("underline")) fail(`${label}: ${btn.text} underlined`);
    if (!approxNotBlueLink(btn.color)) fail(`${label}: ${btn.text} blue link color ${btn.color}`);
  }
  if (report.overflowX) fail(`${label}: horizontal overflow`);

  if (path.includes("index")) {
    if (report.hasHeroTitle) fail(`${label}: golden CV label should be gone`);
    if (!report.lede.includes("Animation Engineer")) fail(`${label}: wrong home lede`);
    if (!report.hasExperience) fail(`${label}: missing experience timeline`);
    if (!report.hasIdentity) fail(`${label}: missing identity block`);
    if (!report.hasPortrait) fail(`${label}: missing photo placeholder`);
    if (report.timelineItems < 1) fail(`${label}: timeline empty`);
    if (!report.homeSplit) fail(`${label}: experience should sit left of identity on desktop`);
  }

  if (path.includes("portfolio")) {
    if (report.hasEyebrow) fail(`${label}: Selected Work eyebrow should be gone`);
    if (report.projectCount < 1) fail(`${label}: no portfolio items`);
    if (!report.expandOk) fail(`${label}: expand/collapse failed`);
    if (!report.layoutOk) fail(`${label}: expand layout missing media`);
    if (!report.blurbStays) fail(`${label}: short description must stay visible when expanded`);
    if (!report.noExtraDetail) fail(`${label}: expand must not add a second description`);
  }

  return report;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();

  try {
    for (const viewport of VIEWPORTS) {
      await assertPage(page, "/index.html", viewport);
      await assertPage(page, "/portfolio.html", viewport);
    }

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle0" });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('a.btn[href="portfolio.html"]'),
    ]);
    if (!page.url().includes("portfolio.html")) fail("nav: Portfolio click failed");

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('a.btn[href="index.html"]'),
    ]);
    if (!page.url().includes("index.html")) fail("nav: Home click failed");

    await page.goto(`${BASE}/portfolio.html`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => {
      const details = document.querySelector("details[data-project]");
      details.open = true;
      const slot = details.querySelector("[data-media-slot]");
      return slot && slot.dataset.loaded === "true";
    }, { timeout: 3000 });

    console.log(
      JSON.stringify(
        {
          ok: true,
          viewports: VIEWPORTS.map((v) => v.name),
          nav: "PASS",
          mediaOnDemand: "PASS",
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("QA_FAIL:", err.message);
  process.exit(1);
});
