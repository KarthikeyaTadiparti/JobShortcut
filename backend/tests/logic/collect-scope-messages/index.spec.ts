import { test, type BrowserContext, type Page } from "@playwright/test";
import { launchWhatsAppContext, checkWhatsAppAuthState } from "@/automations/whatsapp/whatsapp_session.js";
import { DEFAULT_WHATSAPP_SOURCES } from "@/automations/whatsapp/config/whatsapp-sources.js";
import { ExtractionScope } from "@/automations/whatsapp/whatsapp-types.js";

import { registerCollectScopeMessagesTests } from "./collect-scope-messages.js";

/**
 * Scopes to exercise, in order. Opening a chat marks it read, so 'unread' must run first.
 * Override with COLLECT_SCOPES=unread,today,yesterday (default: today).
 */
const SCOPE_ORDER = [ExtractionScope.UNREAD, ExtractionScope.TODAY, ExtractionScope.YESTERDAY];
const requestedScopes = (process.env.COLLECT_SCOPES ?? ExtractionScope.TODAY)
  .split(",")
  .map((s) => s.trim().toLowerCase());
const scopes = SCOPE_ORDER.filter((s) => requestedScopes.includes(s));

test.describe("WhatsApp Scope Messages Collection Test Suite", { tag: ["@logic", "@collect-messages"] }, () => {
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

  const getContext = () => ({ page, isAuthenticated, sources: DEFAULT_WHATSAPP_SOURCES });

  for (const scope of scopes) {
    registerCollectScopeMessagesTests(getContext, "group", scope);
    registerCollectScopeMessagesTests(getContext, "channel", scope);
  }
});
