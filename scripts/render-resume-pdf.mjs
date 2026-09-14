import puppeteer from "puppeteer-core";

const outPdf = process.argv[2] || "/tmp/test-resume.pdf";
const src = process.argv[3] || "file:///workspace/assets/resume/resume-source.html";

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.goto(src, { waitUntil: "networkidle0" });

// PDF link clicks should open a new tab (same as the on-page resume).
await page.evaluate(() => {
  for (const a of document.querySelectorAll("a[href]")) {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  }
});

// Section rules are 2 CSS-px; snap each h2 bottom to a whole CSS pixel
// so Chrome PDF does not thin some gold bars.
await page.evaluate(() => {
  for (const el of document.querySelectorAll("h2")) {
    const bottom = el.getBoundingClientRect().bottom;
    const delta = Math.round(bottom) - bottom;
    if (Math.abs(delta) > 0.001) {
      el.style.transform = `translateY(${delta}px)`;
    }
  }
});

await page.pdf({
  path: outPdf,
  format: "Letter",
  printBackground: true,
  margin: { top: "0.55in", right: "0.65in", bottom: "0.55in", left: "0.65in" },
});
await browser.close();
console.log("wrote", outPdf);
