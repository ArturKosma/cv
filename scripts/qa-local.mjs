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
    const timeline = document.querySelector(".timeline");
    const timelineItems = [...document.querySelectorAll(".timeline-item")];
    let homeSplit = true;
    if (experience && identity && window.innerWidth > 900) {
      const e = experience.getBoundingClientRect();
      const i = identity.getBoundingClientRect();
      homeSplit = e.left < i.left && i.right > window.innerWidth * 0.45;
    }

    let timelineExpandable = true;
    let timelineGrew = true;
    let timelineLineSpans = true;
    if (timelineItems.length) {
      const first = timelineItems[0];
      const details = first.querySelector("details");
      timelineExpandable = Boolean(details);
      if (details) {
        const beforeH = first.getBoundingClientRect().height;
        const beforeLineH = timeline ? timeline.getBoundingClientRect().height : 0;
        details.open = true;
        const afterH = first.getBoundingClientRect().height;
        const afterLineH = timeline ? timeline.getBoundingClientRect().height : 0;
        const body = details.querySelector(".timeline-body");
        const bodyVisible = body && getComputedStyle(body).display !== "none";
        timelineGrew = afterH > beforeH + 16 && bodyVisible;
        timelineLineSpans = afterLineH > beforeLineH + 16;
        details.open = false;
      }
    }

    const projectList = document.querySelector(".project-list");
    const projectListTopBorder = projectList
      ? getComputedStyle(projectList).borderTopWidth
      : null;

    const details = [...document.querySelectorAll("details[data-project]")];
    let expandOk = true;
    let layoutOk = true;
    let blurbStays = true;
    let hasDetail = true;
    let hasThumb = true;
    let stackedBeats = true;
    let noSideBySideMedia = true;
    if (details.length) {
      const thumb = details[0].querySelector(".project-thumb .thumb-video");
      hasThumb = Boolean(thumb);
      details[0].open = true;
      const body = details[0].querySelector(".project-body");
      const beats = [...details[0].querySelectorAll(".project-beat")];
      const detailsText = details[0].querySelectorAll(".project-detail");
      const blurb = details[0].querySelector(".project-blurb");
      const summary = details[0].querySelector("summary");
      const blurbVisible = blurb && getComputedStyle(blurb).display !== "none";
      const after = summary ? getComputedStyle(summary, "::after") : null;
      const chevronOk =
        Boolean(after) &&
        after.content !== '"+"' &&
        after.content !== '"–"' &&
        after.content !== '"-"';
      const hoverBg = summary ? getComputedStyle(summary).backgroundColor : "";
      const noWash =
        !hoverBg ||
        hoverBg === "rgba(0, 0, 0, 0)" ||
        hoverBg === "transparent";
      layoutOk = Boolean(body && beats.length >= 1);
      stackedBeats = beats.length >= 2;
      blurbStays = Boolean(blurbVisible);
      hasDetail = detailsText.length >= 1 && [...detailsText].every((p) => p.textContent.trim());

      if (window.innerWidth > 720 && beats.length >= 2) {
        const a = beats[0].getBoundingClientRect();
        const b = beats[1].getBoundingClientRect();
        stackedBeats = b.top >= a.bottom - 1;
        for (const beat of beats) {
          const media = beat.querySelector(".media-slot");
          const text = beat.querySelector(".project-detail");
          if (!media || !text) {
            noSideBySideMedia = false;
            break;
          }
          const m = media.getBoundingClientRect();
          const t = text.getBoundingClientRect();
          if (!(t.left >= m.right - 1)) noSideBySideMedia = false;
        }
      }

      expandOk = details[0].open === true;
      details[0].dataset._chevronOk = chevronOk ? "1" : "0";
      details[0].dataset._noWash = noWash ? "1" : "0";
      details[0].dataset._stacked = stackedBeats ? "1" : "0";
      details[0].dataset._pair = noSideBySideMedia ? "1" : "0";
      details[0].open = false;
      if (details[0].open !== false) expandOk = false;
    }

    const nav = document.querySelector(".nav-actions");
    const navBox = nav ? nav.getBoundingClientRect() : null;
    const navPinnedRight =
      Boolean(navBox) && navBox.right >= window.innerWidth - 48 && navBox.left > window.innerWidth * 0.4;
    const pageTitle = document.querySelector(".portfolio-title");

    const firstDetails = document.querySelector("details[data-project]");
    return {
      btnCount: btns.length,
      btns,
      hasBrand: Boolean(brand),
      hasHeroTitle: Boolean(heroTitle),
      hasEyebrow: Boolean(eyebrow),
      hasPageTitle: Boolean(pageTitle),
      lede,
      overflowX,
      homeSplit,
      hasExperience: Boolean(experience),
      hasIdentity: Boolean(identity),
      hasPortrait: Boolean(portrait),
      timelineItems: timelineItems.length,
      timelineExpandable,
      timelineGrew,
      timelineLineSpans,
      projectListTopBorder,
      navPinnedRight,
      projectCount: details.length,
      expandOk,
      layoutOk,
      blurbStays,
      hasDetail,
      hasThumb,
      stackedBeats: firstDetails?.dataset._stacked === "1",
      pairLayout: firstDetails?.dataset._pair === "1",
      chevronOk: firstDetails?.dataset._chevronOk === "1",
      noWash: firstDetails?.dataset._noWash === "1",
      hasSkip: Boolean(document.querySelector(".skip-link")),
      hasMain: Boolean(document.querySelector("#main")),
    };
  });

  if (!report.hasSkip) fail(`${label}: missing skip link`);
  if (!report.hasMain) fail(`${label}: missing #main`);
  if (report.hasBrand) fail(`${label}: brand link should be removed`);
  if (report.btnCount < 2) fail(`${label}: expected Home + Samples buttons`);
  if (report.btns[0].text !== "Home") fail(`${label}: Home should be leftmost nav button`);
  if (report.btns[1].text !== "Samples") fail(`${label}: Samples should follow Home`);
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
    if (!report.timelineExpandable) fail(`${label}: timeline items must be expandable`);
    if (!report.timelineGrew) fail(`${label}: opening a timeline record must expand it`);
    if (!report.timelineLineSpans)
      fail(`${label}: vertical timeline line must grow with expanded records`);
    if (!report.homeSplit) fail(`${label}: experience should sit left of identity on desktop`);
  }

  if (path.includes("samples")) {
    if (report.hasPageTitle) fail(`${label}: big Samples/Portfolio page title should be removed`);
    if (report.projectListTopBorder !== "0px")
      fail(`${label}: samples list must not have a top horizontal line`);
    if (report.projectCount < 1) fail(`${label}: no sample items`);
    if (!report.hasThumb) fail(`${label}: collapsed row must include a video thumb`);
    if (!report.expandOk) fail(`${label}: expand/collapse failed`);
    if (!report.layoutOk) fail(`${label}: expand layout missing beats`);
    if (!report.stackedBeats) fail(`${label}: beats must stack vertically, not side-by-side media`);
    if (!report.pairLayout) fail(`${label}: each beat must be one media + text to the right`);
    if (!report.blurbStays) fail(`${label}: short description must stay visible when expanded`);
    if (!report.hasDetail) fail(`${label}: expand must include detail text`);
    if (!report.chevronOk) fail(`${label}: expand control should be a chevron, not +/-`);
    if (!report.noWash) fail(`${label}: sample hover should not use a row background wash`);
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
      await assertPage(page, "/samples.html", viewport);
    }

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle0" });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('a.btn[href="samples.html"]'),
    ]);
    if (!page.url().includes("samples.html")) fail("nav: Samples click failed");

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('a.btn[href="index.html"]'),
    ]);
    if (!page.url().includes("index.html")) fail("nav: Home click failed");

    await page.goto(`${BASE}/samples.html`, { waitUntil: "networkidle0" });
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
