//https://foundthejob.com/

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

      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const applyLinks = anchors
        .filter((a) => {
          const href = (a as HTMLAnchorElement).href || "";
          // Skip internal links to foundthejob.com
          if (href.includes("foundthejob.com")) {
            return false;
          }

          const text = a.textContent?.trim().toLowerCase() || "";
          const img = a.querySelector("img");
          const imgAlt = img?.getAttribute("alt")?.trim().toLowerCase() || "";
          const imgSrc = img?.getAttribute("src")?.trim().toLowerCase() || "";

          // Check for apply text or image indications
          if (
            text.includes("apply now") ||
            text.includes("click here to apply") ||
            text.includes("apply link") ||
            imgAlt.includes("apply") ||
            imgSrc.includes("apply") ||
            imgSrc.includes("pngitem_1673569")
          ) {
            return true;
          }

          // Check if it is inside a table that mentions "apply"
          const table = a.closest("table");
          if (table) {
            const tableText = table.textContent?.toLowerCase() || "";
            if (tableText.includes("apply") || tableText.includes("check the below button")) {
              return true;
            }
          }

          return false;
        })
        .map((a) => (a as HTMLAnchorElement).href);

      return {
        table: data,
        applyLinks,
      };
    });

    return {
      company: pageData.table["company"] || null,
      jobRole: pageData.table["roles"] || pageData.table["job role"] || pageData.table["role"] || null,
      experience: pageData.table["work experience"] || pageData.table["experience"] || null,
      location: pageData.table["location"] || pageData.table["job location"] || null,
      applyLinks: [...new Set(pageData.applyLinks)],
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}
