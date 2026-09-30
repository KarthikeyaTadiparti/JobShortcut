import { test, type BrowserContext, type Page } from "@playwright/test";
import { launchWhatsAppContext, checkWhatsAppAuthState } from "../../../src/scraper/whatsapp_session.js";
import { DEFAULT_WHATSAPP_GROUPS, DEFAULT_WHATSAPP_CHANNELS } from "../../../src/config/whatsapp-sources.js";

import { registerSearchGroupIterationTests } from "./search-group-iteration.js";
import { registerSearchChannelIterationTests } from "./search-channel-iteration.js";

test.describe("WhatsApp Search Iteration Logic Test Suite", { tag: ["@logic", "@search-iteration"] }, () => {
  let context: BrowserContext;
  let page: Page;
  let isAuthenticated = false;

  test.beforeAll(async () => {
    await test.step("Launch Chromium persistent context and verify WhatsApp session", async () => {
      const session = await launchWhatsAppContext({ headless: true });
      context = session.context;
      page = session.page;

      const authState = await checkWhatsAppAuthState(page, 35000);
      isAuthenticated = authState.authenticated;
    });
  });

  test.afterAll(async () => {
    await test.step("Close browser context", async () => {
      if (context) {
        await context.close().catch(() => {});
      }
    });
  });

  // Individual testcases for iterating groups and channels
  registerSearchGroupIterationTests(() => ({
    page,
    isAuthenticated,
    groups: DEFAULT_WHATSAPP_GROUPS,
  }));

  registerSearchChannelIterationTests(() => ({
    page,
    isAuthenticated,
    channels: DEFAULT_WHATSAPP_CHANNELS,
  }));
});
