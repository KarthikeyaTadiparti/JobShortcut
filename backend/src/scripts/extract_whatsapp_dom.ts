import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium, type Page } from "playwright";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "../config/whatsapp_locators.js";
import { getDefaultWhatsAppSessionDir } from "../scraper/whatsapp_session.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DomInspectionResult {
  locatorId: string;
  name: string;
  category: string;
  status: "OPERATIONAL" | "DEGRADED" | "BROKEN" | "SKIPPED";
  matchedSelector?: string | undefined;
  elementCount: number;
  sampleHtml?: string | undefined;
  sampleAttributes?: Record<string, string> | undefined;
}

async function waitForWhatsAppReady(page: Page, maxWaitMs = 45000): Promise<void> {
  try {
    const loadingOverlay = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.loadingProgressBar));
    const isOverlay = await loadingOverlay.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (isOverlay) {
      await loadingOverlay.first().waitFor({ state: "detached", timeout: maxWaitMs }).catch(() => {});
    }
  } catch {
    // ignore
  }

  const readySelectors = [
    getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer),
    getCombinedSelector(WHATSAPP_LOCATORS.conversationHeader),
    getCombinedSelector(WHATSAPP_LOCATORS.qrCanvas),
    getCombinedSelector(WHATSAPP_LOCATORS.channelsTabBtn),
  ].join(", ");

  const readyLoc = page.locator(readySelectors);
  await readyLoc.first().waitFor({ state: "visible", timeout: maxWaitMs }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function extractDomAndVerify(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const headed = args.includes("--headed");
  const isChannelsMode = args.includes("--channels") || args.some((a) => a.startsWith("--channel="));
  const targetChannelArg = args.find((a) => a.startsWith("--channel="));
  const targetChannel = targetChannelArg ? targetChannelArg.split("=")[1] : "Freshershunt";

  const targetGroupArg = args.find((a) => a.startsWith("--group="));
  const targetGroup = targetGroupArg ? targetGroupArg.split("=")[1] : (isChannelsMode ? "" : "Jobcode 37");

  const outputDir = path.resolve(__dirname, "../../artifacts");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputHtmlPath = path.join(outputDir, "whatsapp_dom_snapshot.html");
  const outputSideHtmlPath = path.join(outputDir, "whatsapp_dom_side_pane.html");
  const outputMainHtmlPath = path.join(outputDir, "whatsapp_dom_main_chat.html");
  const outputJsonPath = path.join(outputDir, "whatsapp_dom_report.json");

  const sessionDir = getDefaultWhatsAppSessionDir();
  console.log(`\n================================================================================`);
  console.log(`            WHATSAPP WEB DOM EXTRACTION & LOCATOR VERIFIER`);
  console.log(`================================================================================`);
  console.log(`📁 Session Dir:    ${sessionDir}`);
  console.log(`🖥️  Mode:           ${headed ? "Headed (Browser Visible)" : "Headless"}`);
  console.log(`🎯 Ingestion Type: ${isChannelsMode ? `Channel ("${targetChannel}")` : `Group ("${targetGroup}")`}`);
  console.log(`📦 Output Dir:     ${outputDir}\n`);

  console.log("🚀 Launching Chromium persistent context...");
  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: !headed,
    viewport: { width: 1440, height: 900 },
    ignoreDefaultArgs: ["--enable-automation"],
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
    ],
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    console.log("🌐 Navigating to https://web.whatsapp.com...");
    await page.goto("https://web.whatsapp.com", { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitForWhatsAppReady(page);

    if (isChannelsMode) {
      console.log(`📺 Navigating to Channels / Updates tab...`);
      const channelsTab = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelsTabBtn)).first();

      if (await channelsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await channelsTab.click();
        console.log(`✅ Clicked Channels tab button`);
        await page.waitForTimeout(2500);

        // Click target channel
        console.log(`🔍 Locating and opening channel: "${targetChannel}"...`);
        const channelItem = page
          .locator(getCombinedSelector(WHATSAPP_LOCATORS.channelListRow))
          .filter({ hasText: new RegExp(targetChannel || "", "i") })
          .first();

        if (await channelItem.isVisible({ timeout: 4000 }).catch(() => false)) {
          await channelItem.click({ force: true });
          console.log(`✅ Clicked channel: "${targetChannel}"`);
          await page.waitForTimeout(3000);
        } else {
          // Fall back to first channel
          const firstChannel = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelListRow)).first();
          if (await firstChannel.isVisible({ timeout: 2000 }).catch(() => false)) {
            await firstChannel.click({ force: true });
            console.log(`✅ Clicked first available channel in list`);
            await page.waitForTimeout(3000);
          }
        }
      }
    } else if (targetGroup) {
      console.log(`🔍 Searching and opening chat: "${targetGroup}"...`);
      try {
        const searchInput = page
          .locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput))
          .first();

        if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await searchInput.click();
          await searchInput.fill(targetGroup);
          await page.waitForTimeout(1500);

          const matchingRow = page
            .locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListRow))
            .filter({ hasText: new RegExp(targetGroup || "", "i") })
            .first();

          if (await matchingRow.isVisible({ timeout: 4000 }).catch(() => false)) {
            await matchingRow.click();
            console.log(`✅ Opened chat: "${targetGroup}"`);
            await page.waitForTimeout(2000);
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ Could not auto-select group: ${err.message}`);
      }
    }

    // 1. Extract Full DOM Snapshot
    console.log("\n📦 Extracting DOM snapshots...");
    const fullHtml = await page.content();
    fs.writeFileSync(outputHtmlPath, fullHtml, "utf-8");
    console.log(`✅ Saved full DOM snapshot (${(fullHtml.length / 1024).toFixed(1)} KB) -> ${outputHtmlPath}`);

    // 2. Extract Scoped Side Pane (#side or Channel Drawer)
    const sidePaneSelector = [
      getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer),
      getCombinedSelector(WHATSAPP_LOCATORS.channelsListContainer),
      "#side",
    ].join(", ");
    const sidePane = page.locator(sidePaneSelector).first();
    if (await sidePane.isVisible().catch(() => false)) {
      const sideHtml = await sidePane.evaluate((el) => el.outerHTML);
      fs.writeFileSync(outputSideHtmlPath, sideHtml, "utf-8");
      console.log(`✅ Saved Left Side Pane DOM (${(sideHtml.length / 1024).toFixed(1)} KB) -> ${outputSideHtmlPath}`);
    }

    // 3. Extract Scoped Active Conversation Pane (#main)
    const mainPane = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.conversationHeader)).first();
    if (await mainPane.isVisible().catch(() => false)) {
      const mainHtml = await page.locator("#main").evaluate((el) => el.outerHTML).catch(() => "");
      if (mainHtml) {
        fs.writeFileSync(outputMainHtmlPath, mainHtml, "utf-8");
        console.log(`✅ Saved Active Chat DOM (${(mainHtml.length / 1024).toFixed(1)} KB) -> ${outputMainHtmlPath}`);
      }
    }

    // 4. Verify all locators in WHATSAPP_LOCATORS against live DOM
    console.log("\n🔍 Verifying all catalog locators against live DOM...");
    const results: DomInspectionResult[] = [];

    for (const [id, def] of Object.entries(WHATSAPP_LOCATORS)) {
      let matchedSelector: string | undefined;
      let status: "OPERATIONAL" | "DEGRADED" | "BROKEN" | "SKIPPED" = "BROKEN";
      let count = 0;
      let sampleHtml: string | undefined;
      let sampleAttributes: Record<string, string> | undefined;

      // Test Primary
      const primaryLoc = page.locator(def.primary);
      const isPrimaryVisible = await primaryLoc.first().isVisible({ timeout: 1200 }).catch(() => false);

      if (isPrimaryVisible) {
        status = "OPERATIONAL";
        matchedSelector = def.primary;
        count = await primaryLoc.count();
        sampleHtml = (await primaryLoc.first().evaluate((el) => el.outerHTML.slice(0, 300))).trim();
        sampleAttributes = await primaryLoc.first().evaluate((el) => {
          const attrs: Record<string, string> = {};
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            if (attr) attrs[attr.name] = attr.value;
          }
          return attrs;
        });
      } else {
        // Test Fallbacks
        for (const fb of def.fallbacks) {
          const fbLoc = page.locator(fb);
          const isFbVisible = await fbLoc.first().isVisible({ timeout: 600 }).catch(() => false);
          if (isFbVisible) {
            status = "DEGRADED";
            matchedSelector = fb;
            count = await fbLoc.count();
            sampleHtml = (await fbLoc.first().evaluate((el) => el.outerHTML.slice(0, 300))).trim();
            sampleAttributes = await fbLoc.first().evaluate((el) => {
              const attrs: Record<string, string> = {};
              for (let i = 0; i < el.attributes.length; i++) {
                const attr = el.attributes[i];
                if (attr) attrs[attr.name] = attr.value;
              }
              return attrs;
            });
            break;
          }
        }
      }

      if (status === "BROKEN" && def.isOptional) {
        status = "SKIPPED";
      }

      results.push({
        locatorId: id,
        name: def.name,
        category: def.category,
        status,
        matchedSelector,
        elementCount: count,
        sampleHtml,
        sampleAttributes,
      });
    }

    // Save JSON report
    fs.writeFileSync(outputJsonPath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`✅ Saved locator inspection report -> ${outputJsonPath}`);

    // 5. Print Console Diagnostic Table
    console.log("\n" + "=".repeat(100));
    console.log(
      `${"LOCATOR ID".padEnd(26)} ${"STATUS".padEnd(14)} ${"COUNT".padEnd(7)} ${"ACTIVE SELECTOR".padEnd(48)}`
    );
    console.log("-".repeat(100));

    for (const r of results) {
      const statusIcon =
        r.status === "OPERATIONAL"
          ? "✅ OPERATIONAL"
          : r.status === "DEGRADED"
          ? "⚠️  DEGRADED  "
          : r.status === "SKIPPED"
          ? "⏭️  SKIPPED   "
          : "❌ BROKEN    ";

      const selectorDisplay = r.matchedSelector
        ? r.matchedSelector.length > 46
          ? r.matchedSelector.slice(0, 43) + "..."
          : r.matchedSelector
        : "(No match found)";

      console.log(
        `${r.locatorId.padEnd(26)} ${statusIcon} ${String(r.elementCount).padEnd(7)} ${selectorDisplay.padEnd(48)}`
      );
    }
    console.log("=".repeat(100) + "\n");
  } catch (error: any) {
    console.error("❌ Extraction failed with error:", error);
  } finally {
    await context.close();
    console.log("🏁 Browser context closed.\n");
  }
}

extractDomAndVerify().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
