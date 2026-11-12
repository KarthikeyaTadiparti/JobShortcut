//https://freshershunt.in/

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

      // 1. New FreshersHunt card layout ("job details at a glance"):
      //    flex-wrap container holding 2-div label/value cells.
      document
        .querySelectorAll('div[style*="flex-wrap:wrap"] > div, div[style*="flex-wrap: wrap"] > div')
        .forEach((cell) => {
          const children = Array.from(cell.children).filter((el) => el.tagName === "DIV");
          if (children.length === 2) {
            const key = children[0]?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
            const value = children[1]?.textContent?.replace(/\s+/g, " ").trim() || "";
            if (key && value && !data[key]) {
              data[key] = value;
            }
          }
        });

      // 2. Legacy table-based layout fallback
      document.querySelectorAll("table tr").forEach((row) => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const key = cells[0]?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
          const value = cells[1]?.textContent?.replace(/\s+/g, " ").trim() || "";
          if (key && value && !data[key]) {
            data[key] = value;
          }
        }
      });

      const directLinks: string[] = [];
      for (const sel of ["a#fh-apply-src[href]", "a#fh-apply-btn[href]"]) {
        const anchor = document.querySelector(sel) as HTMLAnchorElement | null;
        if (anchor?.href) directLinks.push(anchor.href);
      }

      const howToApplyLinks: string[] = [];
      for (const el of Array.from(document.querySelectorAll("[id]"))) {
        const id = el.id.toLowerCase();
        if (!id.startsWith("how_to_apply") && !id.startsWith("how-to-apply")) continue;
        let startNode: Element | null = el;
        if (
          el.tagName === "SPAN" &&
          el.parentElement &&
          (el.parentElement.tagName.startsWith("H") || el.parentElement.tagName === "P")
        ) {
          startNode = el.parentElement;
        }
        let next = startNode.nextElementSibling;
        for (let i = 0; i < 6 && next; i++) {
          const anchors = Array.from(next.querySelectorAll("a[href]")) as HTMLAnchorElement[];
          if (next.tagName === "A") anchors.unshift(next as HTMLAnchorElement);
          for (const a of anchors) {
            if (a.href) howToApplyLinks.push(a.href);
          }
          next = next.nextElementSibling;
        }
      }

      const textFallbackLinks: string[] = [];
      for (const a of Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[]) {
        const text = a.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
        if (
          text.includes("apply on official portal") ||
          text.includes("apply now") ||
          text.includes("click here to apply") ||
          text.startsWith("apply for ")
        ) {
          if (a.href) textFallbackLinks.push(a.href);
        }
      }

      return {
        table: data,
        directLinks,
        howToApplyLinks,
        textFallbackLinks,
      };
    });

    const excludedDomains = [
      "freshershunt.in",
      "t.me",
      "telegram.me",
      "telegram.org",
      "whatsapp.com",
      "instagram.com",
      "facebook.com",
      "twitter.com",
      "x.com",
      "linkedin.com",
      "youtube.com",
      "pinterest.com",
      "play.google.com",
      "apps.apple.com",
    ];
    const pageUrlObj = new URL(url);
    const isValidApplyHref = (href: string): boolean => {
      const trimmed = href.trim();
      if (!/^https?:\/\//i.test(trimmed)) return false;
      try {
        const parsed = new URL(trimmed);
        if (parsed.pathname === pageUrlObj.pathname && parsed.hostname === pageUrlObj.hostname) {
          return false;
        }
        const host = parsed.hostname.toLowerCase();
        return !excludedDomains.some((d) => host === d || host.endsWith(`.${d}`));
      } catch {
        return false;
      }
    };

    let applyLinks = pageData.directLinks.filter(isValidApplyHref);
    if (applyLinks.length === 0) {
      applyLinks = pageData.howToApplyLinks.filter(isValidApplyHref);
    }
    if (applyLinks.length === 0) {
      applyLinks = pageData.textFallbackLinks.filter(isValidApplyHref);
    }

    return {
      company: pageData.table["company"] || pageData.table["company name"] || pageData.table["organization"] || null,
      jobRole:
        pageData.table["role"] ||
        pageData.table["job role"] ||
        pageData.table["position"] ||
        pageData.table["job title"] ||
        pageData.table["designation"] ||
        null,
      experience:
        pageData.table["experience"] ||
        pageData.table["experience required"] ||
        pageData.table["experience level"] ||
        null,
      location:
        pageData.table["location"] ||
        pageData.table["job location"] ||
        pageData.table["work mode"] ||
        pageData.table["work location"] ||
        null,
      applyLinks: [...new Set(applyLinks)],
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

