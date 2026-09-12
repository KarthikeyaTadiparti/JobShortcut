import { fileURLToPath } from "url";
import path from "path";
import readline from "readline";
import { extractJobLinks as scrapeJobcode } from "./jobcode_scraper.js";
import { extractJobLinks as scrapeFreshers } from "./freshers_scraper.js";
import { extractJobLinks as scrapePlacement } from "./placement_officer_scraper.js";
import { extractJobLinks as scrapeFreshersHunt } from "./freshers_hunt_scraper.js";
import { extractJobLinks as scrapeDailyPharma } from "./dailypharmajobs_scraper.js";
import { extractJobLinks as scrapeFoundTheJob } from "./found_the_job_scraper.js";
import { checkApplyLinkExists } from "../services/job-services.js";

export interface ScrapedJob {
  company: string | null;
  jobRole: string | null;
  experience: string | null;
  location: string | null;
  applyLinks: string[];
  alreadyExists?: boolean;
  duplicateLinks?: string[];
  status?: "scraped" | "duplicate";
}

/**
 * Routes a single URL to its specialized scraper.
 * Returns null if the scraper fails or the domain is unsupported.
 */
export async function scrapeUrl(url: string): Promise<ScrapedJob | null> {
  try {
    let result: ScrapedJob | null = null;
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname.includes("jobcode.in")) {
      result = await scrapeJobcode(url);
    } else if (hostname.includes("freshersrecruitment.co.in") || hostname.includes("freshersvoice.com") || hostname.includes("fvoice.site")|| hostname.includes("fresheropenings.com") || hostname.includes("fresherscareers.co.in")) {
      result = await scrapeFreshers(url);
    } else if (hostname.includes("placement-officer.com")) {
      result = await scrapePlacement(url);
    } else if (hostname.includes("freshershunt.in")) {
      result = await scrapeFreshersHunt(url);
    } else if (hostname.includes("dailypharmajobs.in")) {
      result = await scrapeDailyPharma(url);
    } else if (hostname.includes("foundthejob.com")) {
      result = await scrapeFoundTheJob(url);
    } else {
      console.error(`Unsupported URL domain: ${hostname}`);
      return null;
    }

    if (result) {
      const duplicateLinks: string[] = [];
      if (Array.isArray(result.applyLinks) && result.applyLinks.length > 0) {
        for (const link of result.applyLinks) {
          const exists = await checkApplyLinkExists(link);
          if (exists) {
            duplicateLinks.push(link);
          }
        }
      }

      const isDuplicate = duplicateLinks.length > 0;
      result.duplicateLinks = duplicateLinks;
      result.alreadyExists = isDuplicate;
      result.status = isDuplicate ? "duplicate" : "scraped";
    }

    return result;
  } catch (error) {
    console.error(`Error matching URL ${url}:`, error);
    return null;
  }
}

/**
 * Scrapes multiple URLs, gathers results in a Record, and returns them.
 * Failed/Unsupported URLs will have a null value.
 */
export async function scrapeUrls(
  urls: string[],
  onProgress?: (url: string, status: "start" | "end", result?: ScrapedJob | null) => void | Promise<void>
): Promise<Record<string, ScrapedJob | null>> {
  const results: Record<string, ScrapedJob | null> = {};

  for (const url of urls) {
    try {
      if (onProgress) await onProgress(url, "start");
      const result = await scrapeUrl(url);
      results[url] = result;
      if (onProgress) await onProgress(url, "end", result);
    } catch (error) {
      console.error(`Failed during batch scrape of ${url}:`, error);
      results[url] = null;
      if (onProgress) await onProgress(url, "end", null);
    }
  }

  return results;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter URLs separated by commas:\n", async (input) => {
    rl.close();
    const urls = input
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      console.log("No URLs provided.");
      return;
    }

    console.log(`\nStarting universal scraping for ${urls.length} URL(s)...`);
    const results = await scrapeUrls(urls);

    console.log("\n=================== SCRAPING RESULTS ===================");
    for (const [url, jobData] of Object.entries(results)) {
      console.log(`\nURL: ${url}`);
      if (jobData === null) {
        console.log("Status: FAILED (Returned null)");
      } else {
        console.log("Status: SUCCESS");
        if (jobData.company || jobData.jobRole || jobData.location || jobData.experience) {
          console.log(`  Company: ${jobData.company || "N/A"}`);
          console.log(`  Job Role: ${jobData.jobRole || "N/A"}`);
          console.log(`  Location: ${jobData.location || "N/A"}`);
          console.log(`  Experience: ${jobData.experience || "N/A"}`);
        }
        if (jobData.applyLinks.length === 0) {
          console.log("  Apply Links: No job links found.");
        } else {
          console.log("  Apply Links:");
          jobData.applyLinks.forEach((link, index) => {
            console.log(`    ${index + 1}. ${link}`);
          });
        }
      }
    }
    console.log("\n========================================================");
  });
}

const filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === path.resolve(filename).toLowerCase();

if (isMain) {
  main();
}
