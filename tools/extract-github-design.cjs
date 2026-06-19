const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const root = process.cwd();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });

  await page.goto("https://github.com", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  async function dismissOverlay() {
    const labels = [
      "Accept cookies",
      "Accept",
      "Accept all",
      "Reject",
      "Reject all",
      "OK",
      "I understand",
      "Got it",
      "Zgadzam sie",
      "W porzadku",
    ];

    for (const label of labels) {
      const locator = page.getByRole("button", {
        name: new RegExp(`^${label}$`, "i"),
      });
      if (await locator.count().catch(() => 0)) {
        try {
          await locator.first().click({ timeout: 1500 });
          return true;
        } catch {
          // Overlay was not clickable; continue looking.
        }
      }
    }

    return false;
  }

  await dismissOverlay();
  await page.waitForTimeout(2500);
  await dismissOverlay();

  await fs.mkdir(path.join(root, "assets"), { recursive: true });
  await fs.mkdir(path.join(root, "docs"), { recursive: true });
  await page.screenshot({
    path: path.join(root, "assets", "homepage.png"),
    fullPage: true,
  });

  const coreStyles = await page.evaluate(() => {
    const getStyles = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        color: s.color,
        backgroundColor: s.backgroundColor,
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        padding: s.padding,
        margin: s.margin,
        borderRadius: s.borderRadius,
        lineHeight: s.lineHeight,
        border: s.border,
        boxShadow: s.boxShadow,
      };
    };

    return {
      url: location.href,
      title: document.title,
      body: getStyles(document.body),
      header: getStyles(
        document.querySelector("header") ||
          document.querySelector('[class*="header"]'),
      ),
      nav: getStyles(document.querySelector("nav")),
      h1: getStyles(document.querySelector("h1")),
      h2: getStyles(document.querySelector("h2")),
      link: getStyles(document.querySelector("a")),
      input: getStyles(document.querySelector("input")),
    };
  });

  const colorStyles = await page.evaluate(() => {
    const allEls = document.querySelectorAll("*");
    const bgColors = new Set();
    const textColors = new Set();
    const borderColors = new Set();
    const borderRadii = new Set();
    const shadows = new Set();

    for (let i = 0; i < Math.min(allEls.length, 800); i++) {
      const s = getComputedStyle(allEls[i]);
      if (s.backgroundColor !== "rgba(0, 0, 0, 0)") {
        bgColors.add(s.backgroundColor);
      }
      if (s.color) textColors.add(s.color);
      if (s.borderColor && s.borderColor !== "rgba(0, 0, 0, 0)") {
        borderColors.add(s.borderColor);
      }
      if (s.borderRadius !== "0px") borderRadii.add(s.borderRadius);
      if (s.boxShadow !== "none") shadows.add(s.boxShadow);
    }

    const btnStyles = [];
    for (const btn of document.querySelectorAll(
      'button, [class*="btn"], a[class*="button"], a[href*="signup"]',
    )) {
      const s = getComputedStyle(btn);
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        btnStyles.push({
          text: btn.innerText?.trim().substring(0, 40),
          bg: s.backgroundColor,
          color: s.color,
          borderRadius: s.borderRadius,
          padding: s.padding,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight,
          border: s.border,
          minHeight: `${Math.round(rect.height)}px`,
        });
        if (btnStyles.length >= 10) break;
      }
    }

    return {
      uniqueBackgrounds: [...bgColors].slice(0, 40),
      uniqueTextColors: [...textColors].slice(0, 40),
      uniqueBorderColors: [...borderColors].slice(0, 40),
      uniqueBorderRadii: [...borderRadii].slice(0, 40),
      shadows: [...shadows].slice(0, 20),
      btnStyles,
    };
  });

  const assetStyles = await page.evaluate(() => {
    const logoCandidates = [
      ...document.querySelectorAll(
        'header svg, svg[aria-label*="GitHub" i], a[href="/"] svg',
      ),
    ].map((svg) => ({
      outerHTML: svg.outerHTML.substring(0, 6000),
      aria: svg.getAttribute("aria-label"),
      className: svg.getAttribute("class"),
      width: svg.getAttribute("width"),
      height: svg.getAttribute("height"),
    }));
    const favicon = document.querySelector('link[rel*="icon"]');
    const fontFaces = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.type === CSSRule.FONT_FACE_RULE) {
            fontFaces.push(rule.cssText.substring(0, 500));
          }
        }
      } catch {
        // Cross-origin stylesheets can be unreadable.
      }
    }
    const navLinks = [...document.querySelectorAll("nav a, header a")]
      .slice(0, 12)
      .map((a) => ({
        text: a.innerText?.trim().substring(0, 50),
        color: getComputedStyle(a).color,
        fontWeight: getComputedStyle(a).fontWeight,
        fontSize: getComputedStyle(a).fontSize,
        textTransform: getComputedStyle(a).textTransform,
      }));

    return {
      logoCandidates,
      faviconHref: favicon?.href ?? null,
      fontFaces: fontFaces.slice(0, 12),
      navLinks,
    };
  });

  await fs.writeFile(
    path.join(root, "assets", "github-extracted-styles.json"),
    JSON.stringify({ coreStyles, colorStyles, assetStyles }, null, 2),
  );

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
