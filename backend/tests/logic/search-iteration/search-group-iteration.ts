import { test, expect, type Page } from "@playwright/test";
import {
  searchAndOpenGroup,
  ExtractionScope,
  type SearchAndOpenResult,
} from "@/automations/whatsapp/whatsapp_scraper.js";
import { navigateToChatsTab, randomJitter } from "@/automations/whatsapp/helpers/whatsapp_navigation.js";
import type { WhatsAppGroupConfig } from "@/automations/whatsapp/config/whatsapp-sources.js";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "@/automations/whatsapp/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";

export interface GroupIterationTestContext {
  page: Page;
  isAuthenticated: boolean;
  groups: WhatsAppGroupConfig[];
}

export interface GroupIterationResultItem {
  index: number;
  groupName: string;
  targetDomain: string;
  status: SearchAndOpenResult["status"];
  unreadCount: number;
}

/**
 * Registers the testcase that iterates over configured WhatsApp groups,
 * searches and opens each group, and validates the expected result.
 */
export function registerSearchGroupIterationTests(getContext: () => GroupIterationTestContext): void {
  test.describe("Group Search Iteration", () => {
    test("Iterates over configured WhatsApp groups, searches, and opens each target group", async () => {
      const { page, isAuthenticated, groups } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      const activeGroups = groups.filter((g) => g.enabled !== false);
      expect(activeGroups.length, "At least one group must be configured for iteration").toBeGreaterThan(0);

      await test.step("1. Ensure Chats tab navigation is active before starting group iterations", async () => {
        await navigateToChatsTab(page);
      });

      const iterationResults: GroupIterationResultItem[] = [];

      for (let i = 0; i < activeGroups.length; i++) {
        const group = activeGroups[i]!;
        const itemNumber = i + 1;

        await test.step(`2.${itemNumber}. [Group ${itemNumber}/${activeGroups.length}] Search and open '${group.groupName}'`, async () => {
          await navigateToChatsTab(page);

          const searchInput = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput)).first();
          if ((await searchInput.count()) > 0 && (await searchInput.isVisible().catch(() => false))) {
            await highlightElement(searchInput, 200);
          }

          const result: SearchAndOpenResult = await searchAndOpenGroup(page, group.groupName, ExtractionScope.TODAY);

          iterationResults.push({
            index: itemNumber,
            groupName: group.groupName,
            targetDomain: group.targetDomain,
            status: result.status,
            unreadCount: result.unreadCount,
          });

          await test.info().attach(`group-iteration-${itemNumber}-${group.groupName}`, {
            body: JSON.stringify(result, null, 2),
            contentType: "application/json",
          });

          await test.step(
            `Validate outcome for '${group.groupName}' -> Expected: status in ['opened', 'not_found'] | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
            async () => {
              expect(result, `searchAndOpenGroup for '${group.groupName}' must return a defined result object`).toBeDefined();
              expect(
                ["opened", "not_found"],
                `Expected status 'opened' or 'not_found' for '${group.groupName}', received '${result?.status}'`
              ).toContain(result.status);

              if (result.status === "opened") {
                expect(typeof result.unreadCount, `unreadCount for '${group.groupName}' must be a numeric integer`).toBe("number");
                const headerTitle = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.conversationChatTitle)).first();
                if ((await headerTitle.count()) > 0 && (await headerTitle.isVisible().catch(() => false))) {
                  await highlightElement(headerTitle, 300);
                }
              }
            }
          );

          await randomJitter(400, 800);
        });
      }

      await test.step("3. Attach and validate full group iteration summary report", async () => {
        await test.info().attach("group-iteration-summary", {
          body: JSON.stringify(iterationResults, null, 2),
          contentType: "application/json",
        });

        expect(
          iterationResults.length,
          `Expected iteration count ${activeGroups.length}, processed ${iterationResults.length}`
        ).toBe(activeGroups.length);
      });
    });
  });
}
