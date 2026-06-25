//https://jobs.dailypharmajobs.in

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

  try {
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

      // Get main post title as fallback
      const h1 = document.querySelector("h1.entry-title, h1.post-title, h1");
      const title = h1 ? h1.textContent?.trim() || "" : "";

      // Find all elements containing "how to apply" text
      const allElements = Array.from(document.querySelectorAll("p, div, h2, h3, strong, span, td"));
      const howToApplyElements = allElements.filter((el) => {
        const text = el.textContent?.toLowerCase() || "";
        return text.includes("how to apply") && el.children.length < 5;
      });

      let applyLinks: string[] = [];

      if (howToApplyElements.length > 0) {
        howToApplyElements.forEach((el) => {
          const innerA = el.querySelector("a[href]");
          if (innerA) {
            applyLinks.push((innerA as HTMLAnchorElement).href);
          } else {
            let next = el.nextElementSibling;
            for (let i = 0; i < 5 && next; i++) {
              const siblingA = next.querySelector("a[href]") || (next.tagName === "A" ? next : null);
              if (siblingA) {
                applyLinks.push((siblingA as HTMLAnchorElement).href);
                break;
              }
              next = next.nextElementSibling;
            }
          }
        });
      }

      // Fallback to original timer-link logic if none found
      if (applyLinks.length === 0) {
        const timerLinks = Array.from(document.querySelectorAll("a[href].timer-link"));
        applyLinks = timerLinks.map((a) => (a as HTMLAnchorElement).href);
      }

      return {
        table: data,
        title,
        applyLinks,
      };
    });

    let company = pageData.table["company"] || null;
    let jobRole = pageData.table["job role"] || pageData.table["role"] || null;
    let experience = pageData.table["experience"] || null;
    let location = pageData.table["location"] || pageData.table["job location"] || null;

    if (pageData.title && (!company || !jobRole || !location)) {
      const title = pageData.title;
      if (!company) {
        const match = title.match(/^(.*?)\s+(?:Internship|Hiring|Recruitment)/i);
        company = (match && match[1]) ? match[1].trim() : title.split(/[\s-:]+/)[0] || null;
      }
      if (!jobRole) {
        const match = title.match(/(?:Internship\s+\d{4}|Recruitment\s+\d{4})?\s*[-:]?\s*(.*?)(?:\(|\bmasters\b|-)/i);
        jobRole = (match && match[1]) ? match[1].trim() : null;
      }
      if (!location) {
        const parts = title.split("-");
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            location = lastPart.trim();
          }
        }
      }
      if (!experience) {
        if (title.toLowerCase().includes("masters students") || title.toLowerCase().includes("intern")) {
          experience = "Freshers / Students";
        }
      }
    }

    return {
      company,
      jobRole,
      experience,
      location,
      applyLinks: [...new Set(pageData.applyLinks)],
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

