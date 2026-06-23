//https://freshershunt.in/

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
    // console.log(`Scraping: ${url}`);

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

      // Find elements whose id starts with "how_to_apply" (case-insensitive)
      const allElementsWithId = Array.from(document.querySelectorAll("[id]"));
      const howToApplyHeaders = allElementsWithId.filter((el) => {
        const id = el.id.toLowerCase();
        return id.startsWith("how_to_apply") || id.startsWith("how-to-apply");
      });

      let applyLinks: string[] = [];

      if (howToApplyHeaders.length > 0) {
        howToApplyHeaders.forEach((header) => {
          let startNode: Element | null = header;
          if (
            header.tagName === "SPAN" &&
            header.parentElement &&
            (header.parentElement.tagName.startsWith("H") || header.parentElement.tagName === "P")
          ) {
            startNode = header.parentElement;
          }

          let next = startNode.nextElementSibling;
          for (let i = 0; i < 5 && next; i++) {
            const siblingA = next.querySelector("a[href]") || (next.tagName === "A" ? next : null);
            if (siblingA) {
              applyLinks.push((siblingA as HTMLAnchorElement).href);
              break;
            }
            next = next.nextElementSibling;
          }
        });
      }

      // Fallback to original "apply now" text matching if no ID match found
      if (applyLinks.length === 0) {
        const anchors = Array.from(document.querySelectorAll("a[href]"));
        const fallbackLinks = anchors
          .filter((a) => a.textContent?.trim().toLowerCase().includes("apply now"))
          .map((a) => (a as HTMLAnchorElement).href);
        applyLinks = fallbackLinks;
      }

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

