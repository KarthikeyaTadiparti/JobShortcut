//https://www.freshersvoice.com/
//https://freshersrecruitment.co.in/

import { chromium } from "playwright";
import readline from "readline";

async function extractJobLinks(url: string): Promise<string[]> {
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

    const links = await page.$$eval("a[href]", (anchors) =>
      anchors
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
        .map((a) => (a as HTMLAnchorElement).href)
    );

    return [...new Set(links)];
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "Enter URLs separated by commas:\n",
    async (input: string) => {
      rl.close();

      const urls = input
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);

      for (const url of urls) {
        const jobLinks = await extractJobLinks(url);

        console.log(`\nResults for ${url}:`);

        if (jobLinks.length === 0) {
          console.log("No job links found.");
          continue;
        }

        jobLinks.forEach((link, index) => {
          console.log(`${index + 1}. ${link}`);
        });
      }
    }
  );
}

main();
