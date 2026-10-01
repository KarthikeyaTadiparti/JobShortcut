import { test, expect, type Page } from "@playwright/test";
import {
  searchAndOpenGroup,
  evaluateConversationMessages,
  ExtractionScope,
  type SearchAndOpenResult,
} from "@/automations/whatsapp/whatsapp_scraper.js";
import { navigateToChatsTab, randomJitter } from "@/automations/whatsapp/helpers/whatsapp_navigation.js";
import { cleanExtractedUrl, isMatchingDomain } from "@/automations/whatsapp/helpers/whatsapp_links.js";
import type { WhatsAppGroupConfig } from "@/automations/whatsapp/config/whatsapp-sources.js";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "@/automations/whatsapp/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";

export interface ExtractGroupLinkTestContext {
  page: Page;
  isAuthenticated: boolean;
  groups: WhatsAppGroupConfig[];
}

export interface GroupExtractedLinkResult {
  index: number;
  groupName: string;
  targetDomain: string;
  status: SearchAndOpenResult["status"];
  latestJobLink: string | null;
  totalMessagesRendered: number;
  matchingLinksCount: number;
}

/**
 * Registers the testcase that iterates over configured WhatsApp groups,
 * searches, opens each group, and extracts a single latest matching job link.
 */
export function registerExtractGroupLinkTests(getContext: () => ExtractGroupLinkTestContext): void {
  test.describe("Group Link Extraction", () => {
    test("Extracts a single latest job link from each configured WhatsApp group", async () => {
      const { page, isAuthenticated, groups } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      const activeGroups = groups.filter((g) => g.enabled !== false);
      expect(activeGroups.length, "At least one group must be configured for link extraction").toBeGreaterThan(0);

      await test.step("1. Ensure Chats tab navigation is active before starting group extractions", async () => {
        await navigateToChatsTab(page);
      });

      const extractionResults: GroupExtractedLinkResult[] = [];

      for (let i = 0; i < activeGroups.length; i++) {
        const group = activeGroups[i]!;
        const itemNumber = i + 1;

        await test.step(`2.${itemNumber}. [Group ${itemNumber}/${activeGroups.length}] Open '${group.groupName}' and extract latest job link`, async () => {
          await navigateToChatsTab(page);

          const searchInput = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput)).first();
          if ((await searchInput.count()) > 0 && (await searchInput.isVisible().catch(() => false))) {
            await highlightElement(searchInput, 200);
          }

          const openResult = await searchAndOpenGroup(page, group.groupName, ExtractionScope.TODAY);

          let latestJobLink: string | null = null;
          let renderedCount = 0;
          let matchingLinksCount = 0;

          if (openResult.status === "opened") {
            const headerTitle = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.conversationChatTitle)).first();
            if ((await headerTitle.count()) > 0 && (await headerTitle.isVisible().catch(() => false))) {
              await highlightElement(headerTitle, 250);
            }

            // Wait for messages to settle in conversation panel
            const msgRowSel = getCombinedSelector(WHATSAPP_LOCATORS.messageContainer);
            await page.waitForSelector(msgRowSel, { state: "attached", timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(400);

            const rawMessages = await evaluateConversationMessages(page);
            renderedCount = rawMessages.length;

            const matchingLinks: string[] = [];
            // Traverse messages from bottom to top (most recent first) to locate the single latest link
            for (let m = rawMessages.length - 1; m >= 0; m--) {
              const msg = rawMessages[m]!;
              for (const rawLink of msg.rawLinks) {
                const cleaned = cleanExtractedUrl(rawLink);
                if (isMatchingDomain(cleaned, group)) {
                  matchingLinks.push(cleaned);
                  if (!latestJobLink) {
                    latestJobLink = cleaned;
                  }
                }
              }
            }
            matchingLinksCount = matchingLinks.length;
          }

          const groupResult: GroupExtractedLinkResult = {
            index: itemNumber,
            groupName: group.groupName,
            targetDomain: group.targetDomain,
            status: openResult.status,
            latestJobLink,
            totalMessagesRendered: renderedCount,
            matchingLinksCount,
          };

          extractionResults.push(groupResult);

          await test.info().attach(`group-link-extraction-${itemNumber}-${group.groupName}`, {
            body: JSON.stringify(groupResult, null, 2),
            contentType: "application/json",
          });

          await test.step(
            `Validate extraction outcome for '${group.groupName}' -> Expected: status in ['opened', 'not_found'] | Received: { status: '${openResult.status}', latestLink: '${latestJobLink || "none"}' }`,
            async () => {
              expect(openResult, `searchAndOpenGroup for '${group.groupName}' must return a defined result object`).toBeDefined();
              expect(
                ["opened", "not_found"],
                `Expected status 'opened' or 'not_found' for '${group.groupName}', received '${openResult.status}'`
              ).toContain(openResult.status);

              if (openResult.status === "opened" && latestJobLink) {
                expect(
                  latestJobLink.startsWith("http://") || latestJobLink.startsWith("https://"),
                  `Extracted job link '${latestJobLink}' must be a valid HTTP/HTTPS URL`
                ).toBe(true);

                expect(
                  isMatchingDomain(latestJobLink, group),
                  `Extracted link '${latestJobLink}' must match group domain '${group.targetDomain}'`
                ).toBe(true);
              }
            }
          );

          await randomJitter(400, 800);
        });
      }

      await test.step("3. Attach and validate full group link extraction summary report", async () => {
        await test.info().attach("group-link-extraction-summary", {
          body: JSON.stringify(extractionResults, null, 2),
          contentType: "application/json",
        });

        expect(
          extractionResults.length,
          `Expected processed group count ${activeGroups.length}, got ${extractionResults.length}`
        ).toBe(activeGroups.length);
      });
    });
  });
}
