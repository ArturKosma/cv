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

// Section / contact rules are 2 CSS-px; snap each bar bottom to a whole
// CSS pixel so Chrome PDF does not thicken one underline vs another.
await page.evaluate(() => {
  for (const el of document.querySelectorAll("h2, .contact-rule")) {
    const rect = el.getBoundingClientRect();
    const delta = Math.round(rect.bottom) - rect.bottom;
    if (Math.abs(delta) > 0.001) {
      el.style.transform = `translateY(${delta}px)`;
    }
  }
  // Second pass after transforms settle, so contact rules match each other.
  for (const el of document.querySelectorAll(".contact-rule")) {
    const rect = el.getBoundingClientRect();
    const delta = Math.round(rect.top) - rect.top;
    if (Math.abs(delta) > 0.001) {
      const cur = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      const y = (cur.isIdentity ? 0 : cur.m42) + delta;
      el.style.transform = `translateY(${y}px)`;
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
