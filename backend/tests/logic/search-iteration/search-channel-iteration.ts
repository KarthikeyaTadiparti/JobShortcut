import { test, expect, type Page } from "@playwright/test";
import {
  openFollowedChannel,
  navigateToChannelsTab,
  randomJitter,
  ExtractionScope,
  type SearchAndOpenResult,
} from "../../../src/scraper/whatsapp_scraper.js";
import type { WhatsAppChannelConfig } from "../../../src/config/whatsapp-sources.js";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "../../../src/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";

export interface ChannelIterationTestContext {
  page: Page;
  isAuthenticated: boolean;
  channels: WhatsAppChannelConfig[];
}

export interface ChannelIterationResultItem {
  index: number;
  channelName: string;
  targetDomain: string;
  status: SearchAndOpenResult["status"];
  unreadCount: number;
}

/**
 * Registers the testcase that iterates over configured WhatsApp channels,
 * searches and opens each channel, and validates the expected result.
 */
export function registerSearchChannelIterationTests(getContext: () => ChannelIterationTestContext): void {
  test.describe("Channel Search Iteration", () => {
    test("Iterates over configured WhatsApp channels, searches, and opens each target channel", async () => {
      const { page, isAuthenticated, channels } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      const activeChannels = channels.filter((c) => c.enabled !== false);
      expect(activeChannels.length, "At least one channel must be configured for iteration").toBeGreaterThan(0);

      await test.step("1. Ensure Channels tab navigation is active before starting channel iterations", async () => {
        await navigateToChannelsTab(page);
      });

      const iterationResults: ChannelIterationResultItem[] = [];

      for (let i = 0; i < activeChannels.length; i++) {
        const channel = activeChannels[i]!;
        const itemNumber = i + 1;

        await test.step(`2.${itemNumber}. [Channel ${itemNumber}/${activeChannels.length}] Locate and open '${channel.channelName}'`, async () => {
          await navigateToChannelsTab(page);

          const searchInput = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput)).first();
          if ((await searchInput.count()) > 0 && (await searchInput.isVisible().catch(() => false))) {
            await highlightElement(searchInput, 200);
          }

          const result: SearchAndOpenResult = await openFollowedChannel(page, channel.channelName, ExtractionScope.TODAY);

          iterationResults.push({
            index: itemNumber,
            channelName: channel.channelName,
            targetDomain: channel.targetDomain,
            status: result.status,
            unreadCount: result.unreadCount,
          });

          await test.info().attach(`channel-iteration-${itemNumber}-${channel.channelName}`, {
            body: JSON.stringify(result, null, 2),
            contentType: "application/json",
          });

          await test.step(
            `Validate outcome for '${channel.channelName}' -> Expected: status in ['opened', 'not_found'] | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
            async () => {
              expect(result, `openFollowedChannel for '${channel.channelName}' must return a defined result object`).toBeDefined();
              expect(
                ["opened", "not_found"],
                `Expected status 'opened' or 'not_found' for '${channel.channelName}', received '${result?.status}'`
              ).toContain(result.status);

              if (result.status === "opened") {
                expect(typeof result.unreadCount, `unreadCount for '${channel.channelName}' must be a numeric integer`).toBe("number");
                const channelTitle = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelChatTitle)).first();
                if ((await channelTitle.count()) > 0 && (await channelTitle.isVisible().catch(() => false))) {
                  await highlightElement(channelTitle, 300);
                }
              }
            }
          );

          await randomJitter(400, 800);
        });
      }

      await test.step("3. Attach and validate full channel iteration summary report", async () => {
        await test.info().attach("channel-iteration-summary", {
          body: JSON.stringify(iterationResults, null, 2),
          contentType: "application/json",
        });

        expect(
          iterationResults.length,
          `Expected iteration count ${activeChannels.length}, processed ${iterationResults.length}`
        ).toBe(activeChannels.length);
      });
    });
  });
}
