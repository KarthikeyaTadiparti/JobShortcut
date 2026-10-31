import { test, expect, type Page } from "@playwright/test";
import { openFollowedChannel, type SearchAndOpenResult } from "@/automations/whatsapp/helpers/whatsapp_open_chat.js";
import { evaluateConversationMessages } from "@/automations/whatsapp/helpers/whatsapp_messages.js";
import { ExtractionScope } from "@/automations/whatsapp/whatsapp_types.js";
import { navigateToChannelsTab, randomJitter } from "@/automations/whatsapp/helpers/whatsapp_navigation.js";
import { cleanExtractedUrl, isMatchingDomain } from "@/automations/whatsapp/helpers/whatsapp_links.js";
import type { WhatsAppChannelConfig } from "@/automations/whatsapp/config/whatsapp_sources.js";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "@/automations/whatsapp/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";

export interface ExtractChannelLinkTestContext {
  page: Page;
  isAuthenticated: boolean;
  channels: WhatsAppChannelConfig[];
}

export interface ChannelExtractedLinkResult {
  index: number;
  channelName: string;
  targetDomain: string;
  status: SearchAndOpenResult["status"];
  latestJobLink: string | null;
  totalMessagesRendered: number;
  matchingLinksCount: number;
}

/**
 * Registers the testcase that iterates over configured WhatsApp channels,
 * searches, opens each followed channel, and extracts a single latest matching job link.
 */
export function registerExtractChannelLinkTests(getContext: () => ExtractChannelLinkTestContext): void {
  test.describe("Channel Link Extraction", () => {
    test("Extracts a single latest job link from each configured WhatsApp channel", async () => {
      const { page, isAuthenticated, channels } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      const activeChannels = channels.filter((c) => c.enabled !== false);
      expect(activeChannels.length, "At least one channel must be configured for link extraction").toBeGreaterThan(0);

      await test.step("1. Ensure Channels tab navigation is active before starting channel extractions", async () => {
        await navigateToChannelsTab(page);
      });

      const extractionResults: ChannelExtractedLinkResult[] = [];

      for (let i = 0; i < activeChannels.length; i++) {
        const channel = activeChannels[i]!;
        const itemNumber = i + 1;

        await test.step(`2.${itemNumber}. [Channel ${itemNumber}/${activeChannels.length}] Open '${channel.channelName}' and extract latest job link`, async () => {
          await navigateToChannelsTab(page);

          const searchInput = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput)).first();
          if ((await searchInput.count()) > 0 && (await searchInput.isVisible().catch(() => false))) {
            await highlightElement(searchInput, 200);
          }

          const openResult = await openFollowedChannel(page, channel.channelName, ExtractionScope.TODAY);

          let latestJobLink: string | null = null;
          let renderedCount = 0;
          let matchingLinksCount = 0;

          if (openResult.status === "opened") {
            const channelTitle = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelChatTitle)).first();
            if ((await channelTitle.count()) > 0 && (await channelTitle.isVisible().catch(() => false))) {
              await highlightElement(channelTitle, 250);
            }

            // Wait for channel feed messages container to be available
            const messageContainerSel = getCombinedSelector(WHATSAPP_LOCATORS.channelMessageContainer);
            await page.waitForSelector(messageContainerSel, { state: "attached", timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(400);

            const rawMessages = await evaluateConversationMessages(page);
            renderedCount = rawMessages.length;

            const matchingLinks: string[] = [];
            // Traverse broadcast messages from bottom to top (most recent post first)
            for (let m = rawMessages.length - 1; m >= 0; m--) {
              const msg = rawMessages[m]!;
              for (const rawLink of msg.rawLinks) {
                const cleaned = cleanExtractedUrl(rawLink);
                if (isMatchingDomain(cleaned, channel)) {
                  matchingLinks.push(cleaned);
                  if (!latestJobLink) {
                    latestJobLink = cleaned;
                  }
                }
              }
            }
            matchingLinksCount = matchingLinks.length;
          }

          const channelResult: ChannelExtractedLinkResult = {
            index: itemNumber,
            channelName: channel.channelName,
            targetDomain: channel.targetDomain,
            status: openResult.status,
            latestJobLink,
            totalMessagesRendered: renderedCount,
            matchingLinksCount,
          };

          extractionResults.push(channelResult);

          await test.info().attach(`channel-link-extraction-${itemNumber}-${channel.channelName}`, {
            body: JSON.stringify(channelResult, null, 2),
            contentType: "application/json",
          });

          await test.step(
            `Validate extraction outcome for '${channel.channelName}' -> Expected: status in ['opened', 'not_found'] | Received: { status: '${openResult.status}', latestLink: '${latestJobLink || "none"}' }`,
            async () => {
              expect(openResult, `openFollowedChannel for '${channel.channelName}' must return a defined result object`).toBeDefined();
              expect(
                ["opened", "not_found"],
                `Expected status 'opened' or 'not_found' for '${channel.channelName}', received '${openResult.status}'`
              ).toContain(openResult.status);

              if (openResult.status === "opened" && latestJobLink) {
                expect(
                  latestJobLink.startsWith("http://") || latestJobLink.startsWith("https://"),
                  `Extracted channel job link '${latestJobLink}' must be a valid HTTP/HTTPS URL`
                ).toBe(true);

                expect(
                  isMatchingDomain(latestJobLink, channel),
                  `Extracted link '${latestJobLink}' must match channel domain '${channel.targetDomain}'`
                ).toBe(true);
              }
            }
          );

          await randomJitter(400, 800);
        });
      }

      await test.step("3. Attach and validate full channel link extraction summary report", async () => {
        await test.info().attach("channel-link-extraction-summary", {
          body: JSON.stringify(extractionResults, null, 2),
          contentType: "application/json",
        });

        expect(
          extractionResults.length,
          `Expected processed channel count ${activeChannels.length}, got ${extractionResults.length}`
        ).toBe(activeChannels.length);
      });
    });
  });
}
