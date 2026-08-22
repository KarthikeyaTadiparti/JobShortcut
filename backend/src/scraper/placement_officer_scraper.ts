//https://www.placement-officer.com/

import { chromium } from "playwright";

export interface ScrapedJob {
  company: string | null;
  jobRole: string | null;
  experience: string | null;
  location: string | null;
  applyLinks: string[];
}

export async function extractJobLinks(url: string): Promise<ScrapedJob | null> {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  // Block all non-navigation requests (images, styles, ads, external scripts) to prevent timeouts in production
  await page.route("**/*", (route) => {
    if (route.request().isNavigationRequest()) {
      route.continue();
    } else {
      route.abort();
    }
  });

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const pageData = await page.evaluate(() => {
      const data: Record<string, string> = {};

      // 1. Table-based parsing
      const rows = document.querySelectorAll("table tr");
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const cell0 = cells[0];
          const cell1 = cells[1];
          if (cell0 && cell1) {
            const key = cell0.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
            const value = cell1.textContent?.replace(/\s+/g, " ").trim() || "";
            if (key) {
              data[key] = value;
            }
          }
        }
      });

      // 2. Text-based parsing (paragraphs, spans, list items)
      const textElements = document.querySelectorAll("p, li, span, div");
      textElements.forEach((el) => {
        const text = el.textContent || "";
        const lines = text.split("\n");
        lines.forEach((line) => {
          if (line.includes(":")) {
            const parts = line.split(":");
            const firstPart = parts[0] ?? "";
            if (!firstPart) {
              return;
            }

            const key = firstPart
              .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "") // remove emojis
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase();
            const value = parts.slice(1).join(":").replace(/\s+/g, " ").trim();
            if (key && value && !data[key]) {
              data[key] = value;
            }
          }
        });
      });

      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const applyLinks = anchors
        .filter((a) => {
          const text = a.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
          return text.includes("click here to apply") || text.includes("apply here") || text.includes("apply link");
        })
        .map((a) => (a as HTMLAnchorElement).href);

      return {
        table: data,
        applyLinks,
      };
    });

    return {
      company: pageData.table["company"] || null,
      jobRole: pageData.table["role"] || pageData.table["job role"] || null,
      experience: pageData.table["experience required"] || pageData.table["experience"] || null,
      location: pageData.table["job location"] || pageData.table["location"] || null,
      applyLinks: [...new Set(pageData.applyLinks)],
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}
