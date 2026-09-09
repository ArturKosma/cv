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

  const report = await page.evaluate(async () => {
    const btns = [...document.querySelectorAll(".nav-actions .btn")].map((el) => ({
      text: el.textContent.trim(),
      href: el.getAttribute("href"),
      tag: el.tagName.toLowerCase(),
      current: el.getAttribute("aria-current") === "page",
      display: getComputedStyle(el).display,
      color: getComputedStyle(el).color,
      cursor: getComputedStyle(el).cursor,
      pointerEvents: getComputedStyle(el).pointerEvents,
      decoration: getComputedStyle(el).textDecorationLine,
    }));
    const currentNav = btns.find((b) => b.current) || null;
    const brandLink = document.querySelector(".brand-link");
    const heroTitle = document.querySelector(".hero-title");
    const eyebrow = document.querySelector(".eyebrow");
    const lede = "";
    const identityTitle =
      document.querySelector(".identity-title")?.textContent.trim() || "";
    const overflowX =
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;

    const experience = document.querySelector(".experience");
    const identity = document.querySelector(".identity");
    const heroBrand = document.querySelector(".hero-brand");
    const portrait = document.querySelector(".portrait-frame");
    const sectionLabel = document.querySelector(".experience .section-label");
    const timeline = document.querySelector(".timeline");
    const timelineItems = [...document.querySelectorAll(".timeline-item")];
    let homeSplit = true;
    if (experience && identity && window.innerWidth > 900) {
      const e = experience.getBoundingClientRect();
      const i = identity.getBoundingClientRect();
      const pageBox = document.querySelector(".page")?.getBoundingClientRect();
      homeSplit =
        Boolean(pageBox) &&
        i.left < e.left &&
        Math.abs(i.left - pageBox.left) < 3;
    }

    let portraitMatchesText = true;
    if (portrait && identity && heroBrand && window.innerWidth > 900) {
      const brandBox = heroBrand.getBoundingClientRect();
      const portraitBox = portrait.getBoundingClientRect();
      const widthMatch = Math.abs(portraitBox.width - brandBox.width) < 3;
      const rightAligned = Math.abs(portraitBox.right - brandBox.right) < 3;
      portraitMatchesText = widthMatch && rightAligned;
    }
    const titleEl = document.querySelector(".identity .identity-title");
    const hasTagline = Boolean(document.querySelector(".identity-tagline"));
    const brandFamily = heroBrand
      ? getComputedStyle(heroBrand).fontFamily.toLowerCase()
      : "";
    const titleFamily = titleEl ? getComputedStyle(titleEl).fontFamily.toLowerCase() : "";
    const titleAlign = titleEl ? getComputedStyle(titleEl).textAlign : "";
    const titleColor = titleEl ? getComputedStyle(titleEl).color : "";
    const brandIsDisplay = brandFamily.includes("space grotesk");
    let titleIsBody = true;
    if (titleEl) {
      titleIsBody =
        titleFamily.includes("dm sans") &&
        !titleFamily.includes("caveat") &&
        !titleFamily.includes("script");
    }
    const bodyIsDm = getComputedStyle(document.body).fontFamily.toLowerCase().includes("dm sans");
    const portraitIsImage =
      Boolean(portrait) &&
      portrait.tagName === "IMG" &&
      Boolean(portrait.getAttribute("src"));
    const scrollbarGutter = getComputedStyle(document.documentElement).scrollbarGutter;

    let timelineExpandable = true;
    let timelineGrew = true;
    let timelineChevronOk = true;
    if (timelineItems.length) {
      const first = timelineItems[0];
      const details = first.querySelector("details");
      timelineExpandable = Boolean(details);
      if (details) {
        const summary = details.querySelector(".timeline-summary");
        const after = summary ? getComputedStyle(summary, "::after") : null;
        timelineChevronOk =
          Boolean(after) &&
          after.content !== "none" &&
          after.content !== '"+"' &&
          after.content !== '"–"' &&
          after.content !== '"-"';
        details.open = false;
        await new Promise((r) => setTimeout(r, 40));
        const beforeH = first.getBoundingClientRect().height;
        details.open = true;
        // Height-slide needs time to leave the closed size.
        await new Promise((r) => setTimeout(r, 420));
        const afterH = first.getBoundingClientRect().height;
        const body = details.querySelector(".timeline-body");
        const bodyVisible = body && getComputedStyle(body).display !== "none";
        timelineGrew = afterH > beforeH + 16 && bodyVisible;
        details.open = false;
      }
    }

    const projectList = document.querySelector(".project-list");
    const projectListTopBorder = projectList
      ? getComputedStyle(projectList).borderTopWidth
      : null;
    const projectItems = projectList ? [...projectList.children] : [];
    const firstItemTopBorder = projectItems[0]
      ? getComputedStyle(projectItems[0]).borderTopWidth
      : null;
    const lastItemBottomBorder = projectItems.length
      ? getComputedStyle(projectItems[projectItems.length - 1]).borderBottomWidth
      : null;

    const details = [...document.querySelectorAll("details[data-project]")];
    let expandOk = true;
    let layoutOk = true;
    let blurbStays = true;
    let hasDetail = true;
    let hasThumb = true;
    let stackedBeats = true;
    let noSideBySideMedia = true;
    let textFitsMedia = true;
    if (details.length) {
      const thumb = details[0].querySelector(".project-thumb .thumb-video");
      hasThumb = Boolean(thumb);
      details[0].open = true;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
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

      if (window.innerWidth > 720 && beats.length) {
        for (const beat of beats) {
          const media = beat.querySelector(".media-slot");
          const text = beat.querySelector(".project-detail");
          if (!media || !text) continue;
          const m = media.getBoundingClientRect();
          const t = text.getBoundingClientRect();
          const overflowY = getComputedStyle(text).overflowY;
          if (Math.abs(t.top - m.top) > 2) textFitsMedia = false;
          if (t.height > m.height + 2) textFitsMedia = false;
          if (overflowY === "auto" || overflowY === "scroll") textFitsMedia = false;
          if (text.scrollHeight > text.clientHeight + 1) textFitsMedia = false;
        }
      }

      expandOk = details[0].open === true;
      details[0].dataset._chevronOk = chevronOk ? "1" : "0";
      details[0].dataset._noWash = noWash ? "1" : "0";
      details[0].dataset._stacked = stackedBeats ? "1" : "0";
      details[0].dataset._pair = noSideBySideMedia ? "1" : "0";
      details[0].dataset._textFit = textFitsMedia ? "1" : "0";
      const codeCompare = details[0].querySelector(".code-compare");
      const panels = codeCompare ? codeCompare.querySelectorAll(".code-panel") : [];
      details[0].dataset._code =
        codeCompare && panels.length >= 2 && codeCompare.textContent.includes("Before")
          ? "1"
          : "0";
      details[0].open = false;
      if (details[0].open !== false) expandOk = false;
    }

    const nav = document.querySelector(".nav-actions");
    const navBox = nav ? nav.getBoundingClientRect() : null;
    const pageBox = document.querySelector(".page")?.getBoundingClientRect();
    const navPinnedRight =
      Boolean(navBox) &&
      Boolean(pageBox) &&
      Math.abs(navBox.right - pageBox.right) < 4 &&
      (window.innerWidth < 700 || navBox.left > window.innerWidth * 0.25);
    const pageTitle = document.querySelector(".portfolio-title");

    const firstDetails = document.querySelector("details[data-project]");
    const contactCard = document.querySelector(".contact-card");
    const contactAvatar = document.querySelector(".contact-avatar");
    const contactAvatarLink = document.querySelector(".contact-avatar-link");
    const contactLabels = document.querySelectorAll(".contact-label");
    const mailLink = document.querySelector('a[href^="mailto:"]');
    const contactEmailEl = document.querySelector(".contact-email");
    const contactEmailText = document.querySelector(".contact-email .contact-value")?.textContent.trim() || "";
    const contactPhoneEl = document.querySelector(".contact-phone");
    const contactPhoneText = document.querySelector(".contact-phone .contact-value")?.textContent.trim() || "";
    const contactPhoneHref = contactPhoneEl?.getAttribute("href") || "";
    const copyEmailScript = [...document.scripts].some((s) => (s.src || "").includes("copy-email"));
    const linkedIn = [...document.querySelectorAll(".contact-link, .contact-row, a")].find((a) =>
      (a.getAttribute("href") || "").includes("linkedin.com")
    );
    const facebook = [...document.querySelectorAll("a")].find((a) =>
      (a.getAttribute("href") || "").includes("facebook.com")
    );
    const primaryRow = document.querySelector(".contact-row--primary");
    const resumeSheet = document.querySelector(".resume-sheet");
    const resumeFrame = document.querySelector(".resume-frame");
    const resumePage = document.querySelector(".resume-page");
    const resumeActions = [...document.querySelectorAll(".resume-toolbar .resume-action")];
    const resumeOpen = resumeActions[0] || null;
    const resumeDownload =
      document.querySelector(".resume-download") || resumeActions[1] || null;
    const resumeColumn = document.querySelector(".resume-column");
    const ytFacade = document.querySelector(".yt-facade");
    const reelTitle = document.querySelector(".reel-title");
    const contactLede = document.querySelector(".contact-lede")?.textContent.trim() || "";
    const contactLedeColor = document.querySelector(".contact-lede")
      ? getComputedStyle(document.querySelector(".contact-lede")).color
      : "";
    const contactName = document.querySelector(".contact-name");
    const contactValue = document.querySelector(".contact-email .contact-value");
    const contactEmailIcon = document.querySelector(".contact-email .contact-line__icon, .contact-email__icon");
    const contactSocial = document.querySelector(".contact-social");
    const contactIdentity = document.querySelector(".contact-identity");
    const contactCardBox = contactCard?.getBoundingClientRect();
    const contactNameBox = contactName?.getBoundingClientRect();
    const contactValueBox = contactValue?.getBoundingClientRect();
    const contactEmailIconBox = contactEmailIcon?.getBoundingClientRect();
    const contactEmailBox = contactEmailEl?.getBoundingClientRect();
    const contactIdentityBox = contactIdentity?.getBoundingClientRect();
    const contactSocialLinks = [...(contactSocial?.querySelectorAll("a") || [])];
    const socialFirst = contactSocialLinks[0]?.getBoundingClientRect();
    const socialLast = contactSocialLinks.at(-1)?.getBoundingClientRect();
    const contactSocialBox = contactSocial?.getBoundingClientRect();
    const contactEmailGapOk =
      Boolean(contactEmailBox && contactIdentityBox && contactSocialBox) &&
      contactEmailBox.top - contactIdentityBox.bottom >= 20 &&
      contactSocialBox.top - contactEmailBox.bottom >= 20;
    const contactAlignRoot = document.querySelector(".identity-contact") || contactCard;
    const contactAlignBox = contactAlignRoot?.getBoundingClientRect();
    const contactEmailAligned =
      Boolean(contactAlignBox && contactEmailIconBox && contactValueBox) &&
      Math.abs(
        (contactEmailIconBox.left + contactValueBox.right) / 2 -
          (contactAlignBox.left + contactAlignBox.right) / 2
      ) < 4;
    const contactEmailSelectable =
      Boolean(contactValue) &&
      (getComputedStyle(contactValue).userSelect === "text" ||
        getComputedStyle(contactValue).webkitUserSelect === "text");
    const contactEmailCursor = contactEmailEl
      ? getComputedStyle(contactEmailEl).cursor
      : "";
    const contactEmailValueCursor = contactValue
      ? getComputedStyle(contactValue).cursor
      : "";
    const contactSocialBrandMarks =
      Boolean(contactSocialLinks[0]) &&
      contactSocialLinks.every((a) => a.querySelector("svg")) &&
      // LinkedIn / Facebook marks include a filled background shape in the path bbox.
      contactSocialLinks.slice(0, 2).every((a) => {
        const path = a.querySelector("svg path");
        return Boolean(path) && (path.getAttribute("d") || "").length > 80;
      });
    const contactEmailHasIcon =
      Boolean(contactEmailIconBox && contactValueBox) &&
      contactEmailIconBox.right < contactValueBox.left;

    const identityContact = document.querySelector(".identity-contact");
    const identityPortrait = document.querySelector(".identity .portrait");
    const identityContactBox = identityContact?.getBoundingClientRect();
    const identityPortraitBox = identityPortrait?.getBoundingClientRect();
    const phoneBox = contactPhoneEl?.getBoundingClientRect();
    const phoneUnderEmail =
      Boolean(contactEmailBox && phoneBox) && phoneBox.top >= contactEmailBox.bottom - 2;
    const socialUnderPhone =
      Boolean(phoneBox && contactSocialBox) && contactSocialBox.top >= phoneBox.bottom - 2;
    const aboutContactUnderPortrait =
      Boolean(identityContactBox && identityPortraitBox) &&
      identityContactBox.top >= identityPortraitBox.bottom - 2;

    const contactSocialCentered =
      Boolean(contactAlignBox && socialFirst && socialLast) &&
      Math.abs(
        (socialFirst.left + socialLast.right) / 2 -
          (contactAlignBox.left + contactAlignBox.right) / 2
      ) < 4;
    const navChrome = document.querySelector(".nav-actions .btn");
    const navChromeSize = navChrome ? getComputedStyle(navChrome).fontSize : "";
    const navChromeTracking = navChrome ? getComputedStyle(navChrome).letterSpacing : "";
    const resumeActionStyle = resumeOpen
      ? {
          color: getComputedStyle(resumeOpen).color,
          fontWeight: getComputedStyle(resumeOpen).fontWeight,
          letterSpacing: getComputedStyle(resumeOpen).letterSpacing,
          fontSize: getComputedStyle(resumeOpen).fontSize,
          textTransform: getComputedStyle(resumeOpen).textTransform,
        }
      : null;
    const resumeDownloadStyle = resumeDownload
      ? {
          color: getComputedStyle(resumeDownload).color,
          fontWeight: getComputedStyle(resumeDownload).fontWeight,
          letterSpacing: getComputedStyle(resumeDownload).letterSpacing,
          fontSize: getComputedStyle(resumeDownload).fontSize,
          textTransform: getComputedStyle(resumeDownload).textTransform,
        }
      : null;
    const reelTitleStyle = reelTitle
      ? {
          color: getComputedStyle(reelTitle).color,
          fontWeight: getComputedStyle(reelTitle).fontWeight,
          letterSpacing: getComputedStyle(reelTitle).letterSpacing,
          fontSize: getComputedStyle(reelTitle).fontSize,
          textTransform: getComputedStyle(reelTitle).textTransform,
        }
      : null;

    const previewEl = resumeFrame || resumeSheet;
    const previewBox = previewEl?.getBoundingClientRect();
    const openBox = resumeOpen?.getBoundingClientRect();
    const downloadBox = resumeDownload?.getBoundingClientRect();
    const columnBox = resumeColumn?.getBoundingClientRect();
    const facadeBox = ytFacade?.getBoundingClientRect();
    const frameRatio =
      previewBox && previewBox.width > 0 ? previewBox.height / previewBox.width : 0;

    const resumeLeftAligned =
      Boolean(pageBox && previewBox && openBox && columnBox) &&
      Math.abs(previewBox.left - pageBox.left) < 2 &&
      Math.abs(openBox.left - previewBox.left) < 2 &&
      Math.abs(columnBox.left - pageBox.left) < 2 &&
      Math.abs(columnBox.right - previewBox.right) < 2;

    const resumeOpenLeftOfDownload =
      Boolean(openBox && downloadBox) &&
      openBox.right < downloadBox.left &&
      Math.abs(openBox.top - downloadBox.top) < 4;

    const reelFullShell =
      Boolean(pageBox && facadeBox) &&
      Math.abs(facadeBox.left - pageBox.left) < 2 &&
      Math.abs(facadeBox.right - pageBox.right) < 2 &&
      Math.abs(facadeBox.width - pageBox.width) < 2;

    return {
      btnCount: btns.length,
      btns,
      currentNav,
      hasBrand: Boolean(brandLink),
      hasHeroTitle: Boolean(heroTitle),
      hasEyebrow: Boolean(eyebrow),
      hasPageTitle: Boolean(pageTitle),
      lede,
      identityTitle,
      hasTagline,
      titleAlign,
      titleColor,
      scrollbarGutter,
      overflowX,
      homeSplit,
      hasExperience: Boolean(experience),
      hasIdentity: Boolean(identity),
      hasPortrait: Boolean(portrait),
      hasSectionLabel: Boolean(sectionLabel),
      portraitIsImage,
      portraitMatchesText,
      brandIsDisplay,
      titleIsBody,
      bodyIsDm,
      timelineItems: timelineItems.length,
      timelineExpandable,
      timelineGrew,
      timelineChevronOk,
      projectListTopBorder,
      firstItemTopBorder,
      lastItemBottomBorder,
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
      hasCodeCompare: firstDetails?.dataset._code === "1",
      textFitsMedia: firstDetails?.dataset._textFit === "1",
      hasSkip: Boolean(document.querySelector(".skip-link")),
      hasMain: Boolean(document.querySelector("#main")),
      hasContactCard: Boolean(contactCard),
      hasContactAvatar: Boolean(contactAvatar),
      contactAvatarIsLink: Boolean(contactAvatarLink),
      contactLabelCount: contactLabels.length,
      hasEmailLink: Boolean(mailLink) || /@/.test(contactEmailText),
      hasLinkedIn: Boolean(linkedIn),
      hasFacebook: Boolean(facebook),
      primaryIsMailto: primaryRow?.getAttribute("href")?.startsWith("mailto:") || false,
      primaryIsEmailRow: Boolean(primaryRow?.classList.contains("contact-email")),
      contactEmailText,
      contactPhoneText,
      contactPhoneHref,
      hasPhoneLink: Boolean(contactPhoneEl),
      copyEmailScript,
      contactEmailGapOk,
      contactLede,
      contactLedeColor,
      contactEmailAligned,
      contactEmailHasIcon,
      contactEmailSelectable,
      contactEmailCursor,
      contactEmailValueCursor,
      contactSocialCentered,
      aboutContactUnderPortrait,
      phoneUnderEmail,
      socialUnderPhone,
      contactSocialBrandMarks,
      hasResumeSheet: Boolean(resumeSheet),
      hasResumeFrame: Boolean(resumeFrame),
      hasResumePage: Boolean(resumePage),
      resumePageSrc: resumePage?.getAttribute("src") || "",
      resumePageAlt: resumePage?.getAttribute("alt") || "",
      resumeLetterRatio: frameRatio,
      hasResumeDownload: Boolean(resumeDownload),
      hasResumeOpen: Boolean(resumeOpen),
      hasResumeColumn: Boolean(resumeColumn),
      resumeOpenText: resumeOpen?.textContent.trim() || "",
      resumeOpenHref: resumeOpen?.getAttribute("href") || "",
      resumeOpenHasDownload: resumeOpen?.hasAttribute("download") || false,
      resumeOpenTarget: resumeOpen?.getAttribute("target") || "",
      resumeDownloadText: resumeDownload?.textContent.trim() || "",
      resumeDownloadHref: resumeDownload?.getAttribute("href") || "",
      resumeDownloadHasDownload: resumeDownload?.hasAttribute("download") || false,
      resumeLeftAligned,
      resumeOpenLeftOfDownload,
      resumeActionStyle,
      resumeDownloadStyle,
      navChromeSize,
      navChromeTracking,
      hasYtFacade: Boolean(ytFacade),
      ytId: ytFacade?.dataset.youtubeId || "",
      reelFullShell,
      hasReelTitle: Boolean(reelTitle),
      reelTitleText: reelTitle?.textContent.trim() || "",
      resumeDownloadStyle,
      reelTitleStyle,
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
      bg: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
      muted: getComputedStyle(document.documentElement).getPropertyValue("--muted").trim(),
    };
  });

  if (!report.hasSkip) fail(`${label}: missing skip link`);
  if (!report.hasMain) fail(`${label}: missing #main`);
  if (report.hasBrand) fail(`${label}: brand link should be removed`);
  if (report.btnCount !== 4)
    fail(`${label}: expected About, Samples, Reel, Resume`);
  if (report.btns[0].text !== "About")
    fail(`${label}: About should be leftmost nav button`);
  if (report.btns[1].text !== "Samples") fail(`${label}: Samples should follow About`);
  if (report.btns[2].text !== "Reel") fail(`${label}: Reel should follow Samples`);
  if (report.btns[3].text !== "Resume") fail(`${label}: Resume should follow Reel`);
  if (!report.navPinnedRight) fail(`${label}: nav must align to the content shell (top-right)`);
  if (!report.currentNav) fail(`${label}: current page must be marked aria-current=page`);
  if (report.currentNav.href)
    fail(`${label}: current nav item must not be a clickable link`);
  if (report.currentNav.tag !== "span")
    fail(`${label}: current nav item should be a non-link span`);
  if (report.currentNav.cursor !== "default")
    fail(`${label}: current nav item should not show a pointer cursor`);
  if (report.currentNav.pointerEvents !== "none")
    fail(`${label}: current nav item must ignore clicks`);
  const expectedCurrent = path.includes("resume")
      ? "Resume"
      : path.includes("reel")
        ? "Reel"
        : path.includes("samples")
          ? "Samples"
          : "About";
  if (report.currentNav.text !== expectedCurrent)
    fail(`${label}: current nav should be ${expectedCurrent}`);
  for (const btn of report.btns) {
    if (btn.current) continue;
    if (!btn.href) fail(`${label}: ${btn.text} missing href`);
  }
  const reel = report.btns[2];
  if (!reel.current && !String(reel.href || "").includes("reel.html"))
    fail(`${label}: Reel must open the reel subpage`);
  const resume = report.btns[3];
  if (!resume.current && !String(resume.href || "").includes("resume.html"))
    fail(`${label}: Resume must open the resume subpage`);
  for (const btn of report.btns) {
    if (!btn.display.includes("flex")) fail(`${label}: ${btn.text} display=${btn.display}`);
    if (btn.decoration.includes("underline")) fail(`${label}: ${btn.text} underlined`);
    if (!approxNotBlueLink(btn.color)) fail(`${label}: ${btn.text} blue link color ${btn.color}`);
  }
  if (report.overflowX) fail(`${label}: horizontal overflow`);
  if (!String(report.scrollbarGutter || "").includes("stable"))
    fail(`${label}: html should reserve scrollbar-gutter: stable (no layout jump)`);
  if (report.accent.toLowerCase() !== "#c4a35a")
    fail(`${label}: original gold accent drifted: ${report.accent}`);
  if (report.bg.toLowerCase() !== "#0f1412")
    fail(`${label}: original forest bg drifted: ${report.bg}`);
  if (report.muted.toLowerCase() !== "#9aa89f")
    fail(`${label}: original muted drifted: ${report.muted}`);

  if (path.includes("index")) {
    if (report.hasHeroTitle) fail(`${label}: golden CV label should be gone`);
    if (report.identityTitle !== "Principal Animation Engineer")
      fail(`${label}: home identity title should be Principal Animation Engineer`);
    if (report.hasTagline)
      fail(`${label}: home identity should not include a cheeky tagline`);
    if (report.titleAlign !== "left")
      fail(`${label}: home identity title should be left-aligned (got ${report.titleAlign})`);
    if (report.titleColor !== "rgb(232, 236, 233)")
      fail(`${label}: home identity title should use foreground (not accent gold)`);
    if (!report.hasExperience) fail(`${label}: missing experience timeline`);
    if (!report.hasIdentity) fail(`${label}: missing identity block`);
    if (!report.hasPortrait) fail(`${label}: missing photo placeholder`);
    if (report.hasSectionLabel) fail(`${label}: Experience section label above timeline should be removed`);
    if (!report.portraitIsImage) fail(`${label}: portrait should be a real placeholder image`);
    if (viewport.width >= 900 && !report.portraitMatchesText) {
      fail(`${label}: portrait should fill Artur Kosma width and stay right-aligned`);
    }
    if (!report.brandIsDisplay) fail(`${label}: name should use Space Grotesk`);
    if (!report.titleIsBody) fail(`${label}: identity title should use DM Sans body type`);
    if (!report.bodyIsDm) fail(`${label}: body should use DM Sans`);
    if (report.timelineItems < 4) fail(`${label}: expected 4 timeline items`);
    if (!report.timelineExpandable) fail(`${label}: timeline items must be expandable`);
    if (!report.timelineGrew) fail(`${label}: opening a timeline record must expand it`);
    if (!report.timelineChevronOk) fail(`${label}: timeline rows need a quiet chevron, not +/-`);
    if (!report.homeSplit) fail(`${label}: identity must share the page left edge; timeline to the right`);
    if (!report.hasEmailLink) fail(`${label}: About must show email under the portrait`);
    if (!report.hasLinkedIn) fail(`${label}: About must show LinkedIn under the portrait`);
    if (!report.hasFacebook) fail(`${label}: About must show Facebook under the portrait`);
    if (!report.primaryIsMailto) fail(`${label}: email should be a mailto primary contact row`);
    if (!/@gmail.com$/i.test(report.contactEmailText || ""))
      fail(`${label}: contact email text missing`);
    if (!report.copyEmailScript) fail(`${label}: click-to-copy script must be present`);
    if (report.contactEmailCursor !== "pointer")
      fail(`${label}: email should show a pointer cursor on hover`);
    if (report.contactEmailValueCursor !== "pointer")
      fail(`${label}: email address text must also use the pointer cursor`);
    if (!report.contactEmailHasIcon) fail(`${label}: email must show an icon to the left of the address`);
    if (!report.contactEmailSelectable)
      fail(`${label}: email address must remain drag-selectable`);
    if (!report.aboutContactUnderPortrait)
      fail(`${label}: email/socials must sit under the portrait`);
    if (!report.phoneUnderEmail)
      fail(`${label}: phone must sit under the email`);
    if (!report.socialUnderPhone)
      fail(`${label}: socials must sit under the phone`);
    if (!report.contactSocialCentered)
      fail(`${label}: social icons must be horizontally centered under the portrait`);
    if (!report.contactSocialBrandMarks)
      fail(`${label}: social icons should use filled brand marks (LinkedIn square / Facebook circle)`);
  }

  if (path.includes("samples")) {
    if (report.hasPageTitle) fail(`${label}: big Samples/Portfolio page title should be removed`);
    if (report.projectListTopBorder !== "0px")
      fail(`${label}: samples list must not have a top horizontal line`);
    if (report.firstItemTopBorder !== "0px")
      fail(`${label}: first sample row must not have a top horizontal line`);
    if (report.lastItemBottomBorder !== "0px")
      fail(`${label}: last sample row must not have a bottom horizontal line`);
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
    if (!report.hasCodeCompare) fail(`${label}: expanded sample should include before/after code`);
    if (viewport.width > 720 && !report.textFitsMedia) {
      fail(`${label}: expand text must top-align, fit media height, and not use a scrollbar`);
    }
  }

  if (false && path.includes("contact")) {
    /* removed standalone contact page */
  }

  if (path.includes("resume.html")) {
    if (!report.hasResumeFrame || !report.hasResumePage)
      fail(`${label}: resume page must show a full letter-page preview`);
    if (!report.resumePageSrc.includes("Artur-Kosma-Resume.png"))
      fail(`${label}: resume preview must use the letter-page image`);
    if (!/Artur Kosma/i.test(report.resumePageAlt))
      fail(`${label}: resume preview needs a descriptive alt text`);
    if (!(report.resumeLetterRatio > 1.2 && report.resumeLetterRatio < 1.4))
      fail(`${label}: resume frame must be letter-page aspect (~8.5×11)`);
    if (!report.hasResumeOpen) fail(`${label}: resume page must offer Open (native PDF)`);
    if (!report.hasResumeDownload) fail(`${label}: resume page must offer Download`);
    if (!report.hasResumeColumn) fail(`${label}: resume toolbar+preview must share one column`);
    if (report.resumeOpenText.toLowerCase() !== "open")
      fail(`${label}: Open label must be Open (got ${report.resumeOpenText})`);
    if (report.resumeDownloadText.toLowerCase() !== "download")
      fail(`${label}: Download label must be Download (got ${report.resumeDownloadText})`);
    if (!String(report.resumeOpenHref || "").endsWith("resume.pdf"))
      fail(`${label}: Open must point at root resume.pdf for native browser view`);
    if (report.resumeOpenHasDownload)
      fail(`${label}: Open must not force download (native PDF viewer)`);
    if (report.resumeOpenTarget !== "_blank")
      fail(`${label}: Open should open the PDF in a new tab`);
    if (!report.resumeDownloadHref.includes("Artur-Kosma-Resume.pdf"))
      fail(`${label}: Download must point at the PDF`);
    if (!report.resumeDownloadHasDownload)
      fail(`${label}: Download must use the download attribute`);
    if (!report.resumeOpenLeftOfDownload)
      fail(`${label}: Open must sit to the left of Download`);
    if (!report.resumeLeftAligned)
      fail(`${label}: resume Open+preview must share the page left edge (no mid-float toolbar)`);
    if (report.resumeDownloadStyle?.color !== "rgb(196, 163, 90)")
      fail(`${label}: Download must use accent gold`);
    if (report.resumeDownloadStyle?.fontWeight !== "500")
      fail(`${label}: Download weight should be 500`);
    if (report.resumeActionStyle?.color !== report.resumeDownloadStyle?.color)
      fail(`${label}: Open and Download must share the same accent color`);
    if (report.resumeActionStyle?.fontSize !== report.navChromeSize)
      fail(`${label}: Open size must match nav chrome`);
    if (report.resumeActionStyle?.letterSpacing !== report.navChromeTracking)
      fail(`${label}: Open tracking must match nav chrome`);
    if (report.resumeDownloadStyle?.fontSize !== report.navChromeSize)
      fail(`${label}: Download size must match nav chrome`);
    if (report.resumeDownloadStyle?.letterSpacing !== report.navChromeTracking)
      fail(`${label}: Download tracking must match nav chrome`);
  }

  if (path.includes("reel.html")) {
    if (!report.hasYtFacade) fail(`${label}: reel page must embed a YouTube facade`);
    if (!report.ytId) fail(`${label}: reel facade missing youtube id`);
    if (!report.reelFullShell)
      fail(`${label}: reel facade must span the full content shell like Samples`);
    if (!report.hasReelTitle) fail(`${label}: reel must show a quiet year label`);
    if (report.reelTitleText !== "2026")
      fail(`${label}: reel year label should be 2026 (got ${report.reelTitleText})`);
    // Match Resume Open / Download quiet accent recipe (same color/weight/tracking/size as nav chrome).
    if (report.reelTitleStyle?.color !== "rgb(196, 163, 90)")
      fail(`${label}: reel year color must match Resume Open/Download gold`);
    if (report.reelTitleStyle?.fontWeight !== "500")
      fail(`${label}: reel year weight must match Resume Open/Download (500)`);
    if (report.reelTitleStyle?.fontSize !== report.navChromeSize)
      fail(`${label}: reel year size must match nav chrome`);
    if (report.reelTitleStyle?.letterSpacing !== report.navChromeTracking)
      fail(`${label}: reel year tracking must match nav chrome`);
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
      await assertPage(page, "/resume.html", viewport);
      await assertPage(page, "/reel.html", viewport);
    }

    // contact.html is a redirect stub to About
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/contact.html`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const stubOk = await page.evaluate(() => {
      const a = document.querySelector('a[href="index.html"]');
      const refresh = document.querySelector('meta[http-equiv="refresh"]');
      return Boolean(a) && Boolean(refresh);
    });
    if (!stubOk) fail("contact redirect: expected meta refresh + About link");

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
    if (!page.url().includes("index.html")) fail("nav: About click failed");

    await page.goto(`${BASE}/samples.html`, { waitUntil: "networkidle0" });
    const mediaBehavior = await page.evaluate(async () => {
      const details = document.querySelector("details[data-project]");
      details.open = true;
      await new Promise((r) => {
        const start = performance.now();
        const tick = () => {
          const slot = details.querySelector("[data-media-slot]");
          if (slot && slot.dataset.loaded === "true") return r();
          if (performance.now() - start > 2500) return r();
          requestAnimationFrame(tick);
        };
        tick();
      });
      const videos = [...details.querySelectorAll(".media-slot__frame video")];
      return {
        count: videos.length,
        allLoop: videos.every((v) => v.loop),
        allMuted: videos.every((v) => v.muted),
        noControls: videos.every((v) => !v.controls),
        pointerNone: videos.every(
          (v) => getComputedStyle(v).pointerEvents === "none"
        ),
        loaded: details.querySelector("[data-media-slot]")?.dataset.loaded === "true",
      };
    });
    if (!mediaBehavior.loaded) fail("mediaOnDemand: slot did not load");
    if (mediaBehavior.count < 1) fail("mediaOnDemand: no expand videos");
    if (!mediaBehavior.allLoop) fail("mediaOnDemand: expand videos must loop");
    if (!mediaBehavior.allMuted) fail("mediaOnDemand: expand videos must be muted");
    if (!mediaBehavior.noControls) fail("mediaOnDemand: expand videos must have no controls");
    if (!mediaBehavior.pointerNone)
      fail("mediaOnDemand: expand videos must not accept pointer interaction");

    await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle0" });
    const experienceCopy = await page.evaluate(() =>
      [...document.querySelectorAll(".timeline-item")].map((li) => {
        const role = li.querySelector(".timeline-role");
        const project = li.querySelector(".timeline-project");
        const org = li.querySelector(".timeline-org");
        const detail = li.querySelector(".timeline-detail");
        const roleStyle = role ? getComputedStyle(role) : null;
        const projectStyle = project ? getComputedStyle(project) : null;
        const orgStyle = org ? getComputedStyle(org) : null;
        const detailStyle = detail ? getComputedStyle(detail) : null;
        return {
          dates: li.querySelector(".timeline-dates")?.textContent.trim() || "",
          org: org?.textContent.trim() || "",
          role: role?.textContent.trim() || "",
          project: project?.textContent.trim() || "",
          detail: detail?.textContent.trim() || "",
          orgSize: orgStyle ? Number.parseFloat(orgStyle.fontSize) : 0,
          roleSize: roleStyle ? Number.parseFloat(roleStyle.fontSize) : 0,
          projectSize: projectStyle ? Number.parseFloat(projectStyle.fontSize) : 0,
          detailSize: detailStyle ? Number.parseFloat(detailStyle.fontSize) : 0,
          roleColor: roleStyle?.color || "",
          projectColor: projectStyle?.color || "",
          orgColor: orgStyle?.color || "",
          detailColor: detailStyle?.color || "",
        };
      })
    );
    if (experienceCopy.length !== 4) fail("experience: expected 4 roles");
    if (experienceCopy[0].dates !== "2026–Present") fail("experience: newest role should be first");
    if (experienceCopy[0].project !== "Rescue Drone Simulator")
      fail("experience: current project missing");
    if (experienceCopy[2].project !== "Chernobylite 1")
      fail("experience: 2019–2021 must be Chernobylite 1");
    if (experienceCopy[3].project !== "Chernobylite 1")
      fail("experience: 2017–2019 must be Chernobylite 1");
    if (experienceCopy[3].role !== "Junior Programmer")
      fail("experience: junior role missing at end");
    if (!experienceCopy.every((i) => i.org === "The Farm 51"))
      fail("experience: all entries should be The Farm 51");
    if (!experienceCopy.every((i) => i.detail.length > 40))
      fail("experience: each entry needs real detail copy");
    if (
      !experienceCopy.every(
        (i) =>
          i.roleSize < i.orgSize - 1 &&
          i.projectSize < i.orgSize - 1 &&
          i.projectSize <= i.roleSize + 0.25
      )
    ) {
      fail("experience: company > role ≥ project in type size");
    }
    if (
      !experienceCopy.every(
        (i) => i.roleColor !== i.orgColor && i.projectColor !== i.orgColor
      )
    ) {
      fail("experience: role/project must use a different color from company");
    }
    if (
      !experienceCopy.every(
        (i) =>
          i.detailSize > i.roleSize &&
          i.detailColor !== i.orgColor &&
          i.detailColor !== i.projectColor
      )
    ) {
      fail("experience: expanded detail must read clearer than the quiet project line");
    }

    const accordionHome = await page.evaluate(async () => {
      const items = [...document.querySelectorAll(".timeline details")];
      items.forEach((d) => {
        d.open = false;
      });
      items[0].open = true;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      items[1].open = true;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return {
        openCount: items.filter((d) => d.open).length,
        firstOpen: items[0].open,
        secondOpen: items[1].open,
      };
    });
    if (accordionHome.openCount !== 2 || !accordionHome.firstOpen || !accordionHome.secondOpen) {
      fail("experience: opening one timeline record must leave others open");
    }

    const identityLayout = await page.evaluate(async () => {
      const identity = document.querySelector(".identity");
      const timeline = document.querySelector(".timeline");
      const brand = document.querySelector(".hero-brand");
      const portrait = document.querySelector(".portrait-frame");
      const experience = document.querySelector(".experience");
      const pageEl = document.querySelector(".page");
      if (!identity || !timeline || !brand || !portrait || !experience || !pageEl) {
        return { ok: false };
      }

      document.querySelectorAll(".timeline details").forEach((d) => {
        d.open = false;
      });
      window.dispatchEvent(new Event("resize"));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      // Allow expand-close height transition + stretch pass to settle.
      const bottomsAligned = () => {
        if (window.innerWidth < 901) return true;
        const last = document.querySelector(".timeline-item:last-child");
        if (!last) return false;
        return Math.abs(last.getBoundingClientRect().bottom - portrait.getBoundingClientRect().bottom) < 5;
      };
      const settleDeadline = performance.now() + 900;
      while (!bottomsAligned() && performance.now() < settleDeadline) {
        window.dispatchEvent(new Event("resize"));
        await new Promise((r) => setTimeout(r, 50));
      }

      const brandBox = brand.getBoundingClientRect();
      const portraitBox = portrait.getBoundingClientRect();
      const timelineBox = timeline.getBoundingClientRect();
      const experienceBox = experience.getBoundingClientRect();
      const identityBox = identity.getBoundingClientRect();
      const pageBox = pageEl.getBoundingClientRect();
      const nav = document.querySelector(".nav-actions");
      const navBox = nav?.getBoundingClientRect();
      const dates = [...document.querySelectorAll(".timeline-dates")].map((el) =>
        el.getBoundingClientRect().left
      );
      const orgs = [...document.querySelectorAll(".timeline-org")].map((el) =>
        el.getBoundingClientRect().left
      );
      const roles = [...document.querySelectorAll(".timeline-role")];
      const projects = [...document.querySelectorAll(".timeline-project")];
      const lineOk = (el) => {
        const h = el.getBoundingClientRect().height;
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 16;
        return h <= lh * 1.45;
      };
      const rolesOneLine = roles.every(lineOk);
      const projectsOneLine = projects.every(lineOk);
      const projectUnderRole = projects.every((project, i) => {
        const role = roles[i];
        if (!role) return false;
        return project.getBoundingClientRect().top >= role.getBoundingClientRect().bottom - 2;
      });
      const requireOneLine = window.innerWidth >= 1200;
      const lastItem = document.querySelector(".timeline-item:last-child");
      const lastBottom = lastItem?.getBoundingClientRect().bottom ?? 0;
      const bottomsMatch =
        window.innerWidth < 901 || Math.abs(lastBottom - portraitBox.bottom) < 5;

      return {
        ok:
          Boolean(navBox) &&
          Math.abs(portraitBox.width - brandBox.width) < 3 &&
          Math.abs(portraitBox.right - brandBox.right) < 3 &&
          Math.abs(identityBox.left - pageBox.left) < 3 &&
          identityBox.right < experienceBox.left &&
          experienceBox.right - pageBox.right < 2 &&
          Math.abs(experienceBox.left - navBox.left) < 3 &&
          Math.abs(timelineBox.top - portraitBox.top) < 4 &&
          bottomsMatch &&
          (!requireOneLine || (rolesOneLine && projectsOneLine && projectUnderRole)) &&
          dates.every((l) => Math.abs(l - dates[0]) < 1) &&
          orgs.every((l) => Math.abs(l - orgs[0]) < 1),
        pageLeftAligned: Math.abs(identityBox.left - pageBox.left) < 3,
        railAtNavLeft: Boolean(navBox) && Math.abs(experienceBox.left - navBox.left) < 3,
        topsMatch: Math.abs(timelineBox.top - portraitBox.top) < 4,
        bottomsMatch,
        bottomDelta: lastBottom - portraitBox.bottom,
        rolesOneLine,
        projectsOneLine,
        projectUnderRole,
        requireOneLine,
        gap: experienceBox.left - identityBox.right,
        railDelta: navBox ? experienceBox.left - navBox.left : null,
        topDelta: timelineBox.top - portraitBox.top,
      };
    });
    if (!identityLayout.ok) {
      fail(
        `experience: nav-aligned rail, portrait top/bottom (bottomDelta ${identityLayout.bottomDelta}, rolesOneLine ${identityLayout.rolesOneLine}, topDelta ${identityLayout.topDelta})`
      );
    }

    await page.goto(`${BASE}/samples.html`, { waitUntil: "networkidle0" });
    const accordionSamples = await page.evaluate(async () => {
      const items = [...document.querySelectorAll("details[data-project]")];
      items.forEach((d) => {
        d.open = false;
      });
      items[0].open = true;
      await new Promise((r) => setTimeout(r, 40));
      items[2].open = true;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      return {
        openCount: items.filter((d) => d.open).length,
        firstOpen: items[0].open,
        targetOpen: items[2].open,
      };
    });
    if (
      accordionSamples.openCount !== 2 ||
      !accordionSamples.firstOpen ||
      !accordionSamples.targetOpen
    ) {
      fail("samples: opening one record must leave others open");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          viewports: VIEWPORTS.map((v) => v.name),
          nav: "PASS",
          mediaOnDemand: "PASS",
          experience: "PASS",
          accordion: "PASS",
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
