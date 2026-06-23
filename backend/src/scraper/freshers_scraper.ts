//https://www.freshersvoice.com/
//https://freshersrecruitment.co.in/

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

      // Get H2 heading for company name fallback
      const h2Elements = Array.from(document.querySelectorAll("h2"));
      let headingCompany = null;
      for (const h2 of h2Elements) {
        const text = h2.textContent?.trim() || "";
        if (text.includes("Overview") || text.includes("Hiring") || text.includes("Recruitment") || text.includes("Details")) {
          const part = text.split(/hiring|recruitment|overview|details|–|-/i)[0]?.trim();
          if (part) {
            headingCompany = part;
            break;
          }
        }
      }

      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const applyLinks = anchors
        .filter((a) => {
          const text = a.textContent?.trim().toLowerCase();

          // Check if the link text itself contains "apply link", "apply now", or is exactly "apply"
          if (
            text?.includes("click here")
          ) {
            return true;
          }

          // Check if link text is "click here", "apply", or "click" and any ancestor (up to 3 levels) contains "apply link"
          if (
            text === "click here" ||
            text === "apply" ||
            text?.includes("click")
          ) {
            let current: HTMLElement | null = a.parentElement;
            for (let i = 0; i < 3 && current; i++) {
              if (current.textContent?.toLowerCase().includes("apply link")) {
                return true;
              }
              current = current.parentElement;
            }
          }

          return false;
        })
        .map((a) => (a as HTMLAnchorElement).href);

      return {
        table: data,
        headingCompany,
        applyLinks,
      };
    });

    return {
      company: pageData.table["company"] || pageData.headingCompany || null,
      jobRole: pageData.table["job role"] || pageData.table["role"] || null,
      experience: pageData.table["experience"] || null,
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
