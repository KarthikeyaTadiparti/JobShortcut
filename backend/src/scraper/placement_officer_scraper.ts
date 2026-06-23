//https://www.placement-officer.com/

import { chromium } from "playwright";
import readline from "readline";
import { fileURLToPath } from "url";
import path from "path";

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

  try {
    console.log(`Scraping: ${url}`);

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000,
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
            const key = cell0.textContent?.trim().toLowerCase() || "";
            const value = cell1.textContent?.trim() || "";
            if (key) {
              data[key] = value;
            }
          }
        }
      });

      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const applyLinks = anchors
        .filter((a) => a.textContent?.trim().toLowerCase().includes("click here to apply"))
        .map((a) => (a as HTMLAnchorElement).href);

      return {
        table: data,
        applyLinks,
      };
    });

    return {
      company: pageData.table["company"] || null,
      jobRole: pageData.table["role"] || pageData.table["job role"] || null,
      experience: pageData.table["experience"] || null,
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
