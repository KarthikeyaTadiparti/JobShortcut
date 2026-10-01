import { test, expect, type Page } from "@playwright/test";
import {
  searchAndOpenGroup,
  openFollowedChannel,
  collectScopeMessagesWithStats,
  ExtractionScope,
  type RawMessageData,
  type SearchAndOpenResult,
} from "@/automations/whatsapp/whatsapp_scraper.js";
import { navigateToChatsTab, navigateToChannelsTab } from "@/automations/whatsapp/helpers/whatsapp_navigation.js";
import type { HarvestStats } from "@/automations/whatsapp/whatsapp_harvester.js";
import type { WhatsAppSourceConfig, WhatsAppSourceType } from "@/automations/whatsapp/config/whatsapp-sources.js";
import { WHATSAPP_LOCATORS, getCombinedSelector, type LocatorDefinition } from "@/automations/whatsapp/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";
import { summarizeScopeIntegrity, PER_SOURCE_TIMEOUT_MS } from "../../helpers/scope-integrity.js";

export interface CollectScopeMessagesTestContext {
  page: Page;
  isAuthenticated: boolean;
  sources: WhatsAppSourceConfig[];
}

export interface CollectedScopeMessagesResult {
  index: number;
  sourceType: WhatsAppSourceType;
  sourceName: string;
  targetDomain: string;
  scope: ExtractionScope;
  status: SearchAndOpenResult["status"];
  unreadCount: number;
  messagesCount: number;
  totalLinksFound: number;
  stats: HarvestStats | null;
  messages: RawMessageData[];
}

/**
 * The only parts that differ between groups and channels: how the chat is opened,
 * which header is highlighted, and the wording used in reports.
 */
interface SourceAdapter {
  label: string;
  plural: string;
  navigate: (page: Page) => Promise<boolean>;
  open: (page: Page, name: string, scope: ExtractionScope) => Promise<SearchAndOpenResult>;
  searchInput?: LocatorDefinition | undefined;
  header: LocatorDefinition;
}

const ADAPTERS: Record<WhatsAppSourceType, SourceAdapter> = {
  group: {
    label: "Group",
    plural: "groups",
    navigate: async (page) => {
      await navigateToChatsTab(page);
      return true;
    },
    open: searchAndOpenGroup,
    searchInput: WHATSAPP_LOCATORS.chatListSearchInput,
    header: WHATSAPP_LOCATORS.conversationChatTitle,
  },
  channel: {
    label: "Channel",
    plural: "channels",
    navigate: navigateToChannelsTab,
    open: openFollowedChannel,
    header: WHATSAPP_LOCATORS.channelChatTitle,
  },
};

async function highlightIfVisible(page: Page, def: LocatorDefinition, durationMs: number): Promise<void> {
  const locator = page.locator(getCombinedSelector(def)).first();
  if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
    await highlightElement(locator, durationMs);
  }
}

/**
 * Registers the testcase that iterates over the configured WhatsApp sources of one type,
 * opens each chat, and harvests every message in the given scope.
 */
export function registerCollectScopeMessagesTests(
  getContext: () => CollectScopeMessagesTestContext,
  sourceType: WhatsAppSourceType,
  scope: ExtractionScope = ExtractionScope.TODAY
): void {
  const adapter = ADAPTERS[sourceType];

  test.describe(`${adapter.label} Scope Messages Collection [${scope}]`, () => {
    test(`Collects exactly the '${scope}' messages for each configured WhatsApp ${sourceType}`, async () => {
      const { page, isAuthenticated, sources } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      const activeSources = sources.filter((s) => s.type === sourceType && s.enabled !== false);
      test.setTimeout(Math.max(1, activeSources.length) * PER_SOURCE_TIMEOUT_MS);
      expect(activeSources.length, `At least one ${sourceType} must be configured for message collection`).toBeGreaterThan(0);

      await test.step(`1. Ensure ${adapter.label}s navigation is active before starting message collection`, async () => {
        const navigated = await adapter.navigate(page);
        expect(navigated, `Must successfully navigate to the ${adapter.plural} view`).toBe(true);
      });

      const allResults: CollectedScopeMessagesResult[] = [];

      for (let i = 0; i < activeSources.length; i++) {
        const source = activeSources[i]!;
        const itemNumber = i + 1;

        await test.step(`2.${itemNumber}. [${adapter.label} ${itemNumber}/${activeSources.length}] Open '${source.name}' and collect '${scope}' messages`, async () => {
          await adapter.navigate(page);
          if (adapter.searchInput) {
            await highlightIfVisible(page, adapter.searchInput, 200);
          }

          const openResult = await adapter.open(page, source.name, scope);

          let collectedMessages: RawMessageData[] = [];
          let stats: HarvestStats | null = null;

          if (openResult.status === "opened") {
            await highlightIfVisible(page, adapter.header, 250);
            await highlightIfVisible(page, WHATSAPP_LOCATORS.conversationPanelMessages, 200);

            const harvest = await test.step(`Harvest '${scope}' messages across the virtualized history`, async () => {
              return await collectScopeMessagesWithStats(page, scope, openResult.unreadCount);
            });
            collectedMessages = harvest.messages;
            stats = harvest.stats;
          }

          const totalLinksFound = collectedMessages.reduce((sum, m) => sum + m.rawLinks.length, 0);
          const result: CollectedScopeMessagesResult = {
            index: itemNumber,
            sourceType,
            sourceName: source.name,
            targetDomain: source.targetDomain,
            scope,
            status: openResult.status,
            unreadCount: openResult.unreadCount,
            messagesCount: collectedMessages.length,
            totalLinksFound,
            stats,
            messages: collectedMessages,
          };
          allResults.push(result);

          await test.info().attach(`${sourceType}-collected-messages-${scope}-${itemNumber}-${source.name}`, {
            body: JSON.stringify(result, null, 2),
            contentType: "application/json",
          });

          const integrity = summarizeScopeIntegrity(collectedMessages, scope);

          await test.step(
            `Validate outcome for '${source.name}' -> Expected: { duplicates: 0, outOfOrder: 0, outOfScope: 0, unrecoveredGaps: 0, placeholdersRemaining: 0${scope === ExtractionScope.UNREAD ? `, count: ${openResult.unreadCount}` : ""} } | Received: { status: '${openResult.status}', count: ${collectedMessages.length}, duplicates: ${integrity.duplicates}, outOfOrder: ${integrity.outOfOrder}, outOfScope: ${integrity.outOfScope}, unrecoveredGaps: ${stats?.unrecoveredGaps ?? "n/a"}, placeholdersRemaining: ${stats?.placeholdersRemaining ?? "n/a"}, stopReason: '${stats?.stopReason ?? "n/a"}' }`,
            async () => {
              const allowedStatuses: SearchAndOpenResult["status"][] =
                scope === ExtractionScope.UNREAD ? ["opened", "not_found", "skipped_no_unread"] : ["opened", "not_found"];
              expect(allowedStatuses, `Unexpected open status for '${source.name}'`).toContain(openResult.status);

              if (openResult.status !== "opened" || !stats) return;

              expect(integrity.duplicates, "Every message must be harvested exactly once").toBe(0);
              expect(integrity.outOfOrder, "Messages must be ordered oldest -> newest").toBe(0);
              expect(integrity.outOfScope, `Every message must belong to scope '${scope}'`).toBe(0);
              expect(stats.unrecoveredGaps, "Every scrolled window must overlap the previous one").toBe(0);
              expect(stats.placeholdersRemaining, "Every scope message must be read with rendered content").toBe(0);
              expect(["boundary", "top"], "Scan must reach the scope boundary or the start of history").toContain(stats.stopReason);

              if (scope === ExtractionScope.UNREAD && openResult.unreadCount > 0) {
                expect(collectedMessages.length, `Unread message count must equal the ${sourceType} unread badge`).toBe(openResult.unreadCount);
              }
            }
          );
        });
      }

      await test.step(`3. Attach and validate full ${sourceType} message collection summary report`, async () => {
        await test.info().attach(`${sourceType}-collected-messages-summary-${scope}`, {
          body: JSON.stringify(
            allResults.map(({ messages, ...rest }) => rest),
            null,
            2
          ),
          contentType: "application/json",
        });

        expect(
          allResults.length,
          `Expected processed ${sourceType} count ${activeSources.length}, got ${allResults.length}`
        ).toBe(activeSources.length);
      });
    });
  });
}
