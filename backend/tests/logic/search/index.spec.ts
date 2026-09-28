import { test, type BrowserContext, type Page } from "@playwright/test";
import { launchWhatsAppContext, checkWhatsAppAuthState } from "../../../src/scraper/whatsapp_session.js";
import { DEFAULT_WHATSAPP_GROUPS } from "../../../src/config/whatsapp-sources.js";

import { registerUnreadTests } from "./unread.js";
import { registerTodayTests } from "./today.js";
import { registerYesterdayTests } from "./yesterday.js";
import { registerDefaultTests } from "./default.js";

const KNOWN_GROUP_NAME = DEFAULT_WHATSAPP_GROUPS[0]?.groupName || "Jobcode 37";

test.describe("WhatsApp Search & Open Logic Test Suite", () => {
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

  // Individual testcases categorized by scope
  registerUnreadTests(() => ({ page, isAuthenticated, targetGroupName: KNOWN_GROUP_NAME }));
  registerTodayTests(() => ({ page, isAuthenticated, targetGroupName: KNOWN_GROUP_NAME }));
  registerYesterdayTests(() => ({ page, isAuthenticated, targetGroupName: KNOWN_GROUP_NAME }));
  registerDefaultTests(() => ({ page, isAuthenticated, targetGroupName: KNOWN_GROUP_NAME }));
});
