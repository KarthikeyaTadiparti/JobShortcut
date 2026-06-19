//https://jobcode.in/

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
        .filter((a) => a.textContent?.trim().toLowerCase().includes("apply link"))
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