import { test, type BrowserContext, type Page } from "@playwright/test";
import { launchWhatsAppContext, checkWhatsAppAuthState } from "@/automations/whatsapp/whatsapp_session.js";
import { navigateToChannelsTab } from "@/automations/whatsapp/helpers/whatsapp_navigation.js";
import { DEFAULT_WHATSAPP_CHANNELS } from "@/automations/whatsapp/config/whatsapp_sources.js";

import { registerChannelUnreadTests } from "./unread.js";
import { registerChannelTodayTests } from "./today.js";
import { registerChannelYesterdayTests } from "./yesterday.js";

const KNOWN_CHANNEL_NAME = DEFAULT_WHATSAPP_CHANNELS[0]?.channelName || "Freshershunt";

test.describe("WhatsApp Channel Open Logic Test Suite", { tag: ["@logic", "@search-channel"] }, () => {
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

      if (isAuthenticated) {
        await navigateToChannelsTab(page);
      }
    });
  });

  test.afterAll(async () => {
    await test.step("Close browser context", async () => {
      if (context) {
        await context.close().catch(() => {});
      }
    });
  });

  // Individual testcases categorized by scope
  registerChannelUnreadTests(() => ({ page, isAuthenticated, targetChannelName: KNOWN_CHANNEL_NAME }));
  registerChannelTodayTests(() => ({ page, isAuthenticated, targetChannelName: KNOWN_CHANNEL_NAME }));
  registerChannelYesterdayTests(() => ({ page, isAuthenticated, targetChannelName: KNOWN_CHANNEL_NAME }));
});
