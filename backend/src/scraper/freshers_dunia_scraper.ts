//https://freshersdunia.in/

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
      const candidateLinks: string[] = [];

      const excludedDomains = [
        "freshersdunia.in",
        "telegram",
        "t.me",
        "whatsapp",
        "instagram.com",
        "facebook.com",
        "twitter.com",
        "x.com",
        "linkedin.com",
        "pinterest.com",
        "youtube.com",
        "google.com"
      ];

      // 1. Table-based parsing (e.g. Quick Highlights, Important Links)
      const rows = document.querySelectorAll("table tr");
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const cell0 = cells[0];
          const cell1 = cells[1];
          if (cell0 && cell1) {
            const rawKey = cell0.textContent || "";
            const key = rawKey
              .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase();
            const value = cell1.textContent?.replace(/\s+/g, " ").trim() || "";
            if (key) {
              data[key] = value;
            }

            // Check if cell1 has an apply link
            const a = cell1.querySelector("a[href]") as HTMLAnchorElement | null;
            if (a && a.href) {
              const linkText = a.textContent?.trim().toLowerCase() || "";
              if (
                key.includes("apply") ||
                key.includes("application") ||
                key.includes("registration") ||
                key.includes("link") ||
                linkText.includes("apply") ||
                linkText.includes("click here") ||
                linkText.includes("register")
              ) {
                const hrefLower = a.href.toLowerCase();
                let isExcluded = !hrefLower.startsWith("http");
                for (let j = 0; j < excludedDomains.length; j++) {
                  const domain = excludedDomains[j];
                  if (domain && hrefLower.includes(domain)) {
                    isExcluded = true;
                    break;
                  }
                }
                if (!isExcluded) {
                  candidateLinks.push(a.href);
                }
              }
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
            if (!firstPart) return;

            const key = firstPart
              .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
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

      // 3. Fallback apply link search if no table links found
      if (candidateLinks.length === 0) {
        const anchors = Array.from(document.querySelectorAll("article a[href], main a[href], .page-content-single a[href]"));
        for (const a of anchors) {
          const anchor = a as HTMLAnchorElement;
          const href = anchor.href || "";
          const hrefLower = href.toLowerCase();
          let isExcluded = !hrefLower.startsWith("http");
          for (let j = 0; j < excludedDomains.length; j++) {
            const domain = excludedDomains[j];
            if (domain && hrefLower.includes(domain)) {
              isExcluded = true;
              break;
            }
          }
          if (isExcluded) continue;

          const text = anchor.textContent?.trim().toLowerCase() || "";
          if (
            text.includes("apply now") ||
            text.includes("click here to apply") ||
            text.includes("apply link") ||
            text.includes("click here") ||
            text.includes("register here") ||
            text.includes("official application")
          ) {
            candidateLinks.push(href);
          }
        }
      }

      // Title fallback
      const h1 = document.querySelector("h1.title, h1.single, h1.entry-title, h1");
      const title = h1 ? h1.textContent?.replace(/\s+/g, " ").trim() || "" : "";

      return {
        table: data,
        title,
        applyLinks: candidateLinks,
      };
    });

    let company =
      pageData.table["company name"] ||
      pageData.table["company"] ||
      pageData.table["organization"] ||
      null;

    let jobRole =
      pageData.table["job role"] ||
      pageData.table["role"] ||
      pageData.table["position"] ||
      pageData.table["job title"] ||
      pageData.table["designation"] ||
      null;

    let experience =
      pageData.table["experience required"] ||
      pageData.table["experience"] ||
      pageData.table["experience level"] ||
      null;

    let location =
      pageData.table["job location"] ||
      pageData.table["location"] ||
      pageData.table["work flexibility"] ||
      null;

    // Title fallbacks if fields are still missing
    if (pageData.title && (!company || !jobRole || !location)) {
      const title = pageData.title;

      if (!company) {
        const match = title.match(/^(.*?)\s+(?:Off Campus|Recruitment|Hiring|Drive|Careers|Internship)/i);
        if (match && match[1]) {
          company = match[1].trim();
        }
      }

      if (!jobRole) {
        const match = title.match(/(?:Off Campus(?:\s+\d{4})?|Recruitment(?:\s+\d{4})?|Hiring(?:\s+\d{4})?)\s+([–\-|]?[^–\-|]+?)(?:\s+Hiring|\s*–|\s*\||\s*\(|$)/i);
        if (match && match[1]) {
          jobRole = match[1].replace(/^[–\-|]\s*/, "").trim();
        }
      }

      if (!location) {
        const match = title.match(/\|\s*([^|–]+(?:\(Hybrid\)|\(Remote\)|India)?)\s*(?:🚀|[–|]|$)/i);
        if (match && match[1]) {
          location = match[1].trim();
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
