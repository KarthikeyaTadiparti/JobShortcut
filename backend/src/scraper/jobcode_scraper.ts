//https://jobcode.in/

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
        .filter((a) => a.textContent?.trim().toLowerCase().includes("apply link"))
        .map((a) => (a as HTMLAnchorElement).href);

      return {
        table: data,
        applyLinks: applyLinks,
      };
    });

    return {
      company: pageData.table["company"] || null,
      jobRole: pageData.table["job role"] || pageData.table["role"] || null,
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
        const jobData = await extractJobLinks(url);

        console.log(`\nResults for ${url}:`);

        if (jobData === null) {
          console.log("Failed to scrape.");
          continue;
        }

        console.log(`Company: ${jobData.company || "N/A"}`);
        console.log(`Job Role: ${jobData.jobRole || "N/A"}`);
        console.log(`Location: ${jobData.location || "N/A"}`);
        console.log(`Experience: ${jobData.experience || "N/A"}`);

        if (jobData.applyLinks.length === 0) {
          console.log("No job links found.");
          continue;
        }

        console.log("Apply Links:");
        jobData.applyLinks.forEach((link, index) => {
          console.log(`  ${index + 1}. ${link}`);
        });
      }
    }
  );
}

const filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(filename).toLowerCase();

if (isMain) {
  main();
}