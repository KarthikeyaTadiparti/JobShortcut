import { test, type BrowserContext, type Page } from "@playwright/test";
import { launchWhatsAppContext, checkWhatsAppAuthState } from "@/automations/whatsapp/whatsapp_session.js";
import { DEFAULT_WHATSAPP_GROUPS, DEFAULT_WHATSAPP_CHANNELS } from "@/automations/whatsapp/config/whatsapp-sources.js";

import { registerExtractGroupLinkTests } from "./extract-group-link.js";
import { registerExtractChannelLinkTests } from "./extract-channel-link.js";

test.describe("WhatsApp Link Extraction Logic Test Suite", { tag: ["@logic", "@extraction"] }, () => {
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

  // Individual testcases for extracting the single latest link from groups and channels
  registerExtractGroupLinkTests(() => ({
    page,
    isAuthenticated,
    groups: DEFAULT_WHATSAPP_GROUPS,
  }));

  registerExtractChannelLinkTests(() => ({
    page,
    isAuthenticated,
    channels: DEFAULT_WHATSAPP_CHANNELS,
  }));
});
