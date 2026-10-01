import { test, expect } from "@playwright/test";
import {
    assignDates,
    createMergeState,
    detectDateOrder,
    mergeWindow,
    parseDividerDate,
    parseNumericDate,
    sliceScope,
    type HarvestItem,
} from "@/automations/whatsapp/helpers/whatsapp_message_merge.js";
import { collectScopeMessagesWithStats } from "@/automations/whatsapp/whatsapp_harvester.js";
import { ExtractionScope } from "@/automations/whatsapp/whatsapp-types.js";
import { buildVirtualizedChat, type FixtureOptions } from "../../helpers/virtualized-chat-fixture.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";

// Thursday 1 October 2026, local time.
const TODAY = new Date(2026, 9, 1, 12, 0, 0);

const msg = (id: string, extra: Partial<HarvestItem> = {}): HarvestItem => ({
    key: `id:${id}`,
    type: "message",
    dataId: id,
    text: `text ${id}`,
    prePlainText: "",
    rawLinks: [],
    kind: "text",
    truncated: false,
    placeholder: false,
    dividerText: "",
    ...extra,
});

const divider = (label: string): HarvestItem => ({
    key: `divider:${label}`,
    type: "divider",
    text: "",
    prePlainText: "",
    rawLinks: [],
    kind: "other",
    truncated: false,
    placeholder: false,
    dividerText: label,
});

const unreadMarker = (count: number): HarvestItem => ({
    key: "unread-marker",
    type: "unread-marker",
    text: "",
    prePlainText: "",
    rawLinks: [],
    kind: "other",
    truncated: false,
    placeholder: false,
    dividerText: `${count} unread messages`,
});

const keysOf = (items: HarvestItem[]) => items.map((i) => i.key);

test.describe("Message window merge logic (offline)", { tag: ["@logic", "@offline", "@collect-messages"] }, () => {
    test("Overlapping windows merge into one ordered stream without duplicates", async () => {
        const state = createMergeState();
        const newest = [msg("m7"), msg("m8"), msg("m9"), msg("m10")];
        const older = [msg("m4"), msg("m5"), msg("m6"), msg("m7"), msg("m8")];
        const oldest = [msg("m1"), msg("m2"), msg("m3"), msg("m4")];

        const results = await test.step("Merge newest, then two older overlapping windows", async () => {
            return [mergeWindow(state, newest), mergeWindow(state, older), mergeWindow(state, oldest)];
        });

        const received = keysOf(state.ordered);
        const expected = Array.from({ length: 10 }, (_, i) => `id:m${i + 1}`);
        await test.info().attach("merged-order", { body: JSON.stringify({ received, results }, null, 2), contentType: "application/json" });

        await test.step(`Validate outcome -> Expected: { count: 10, gaps: 0 } | Received: { count: ${received.length}, gaps: ${results.filter((r) => r.gap).length} }`, async () => {
            expect(received, "Merged stream must be strictly oldest -> newest with every message once").toEqual(expected);
            expect(results.every((r) => !r.gap), "Overlapping windows must never be reported as gaps").toBe(true);
        });
    });

    test("A placeholder shell is replaced by the rendered row on re-harvest", async () => {
        const state = createMergeState();
        mergeWindow(state, [msg("m1", { text: "", kind: "other", placeholder: true }), msg("m2")]);
        mergeWindow(state, [msg("m1", { prePlainText: "[9:00 am, 1/10/2026] X: ", rawLinks: ["https://a.example/1"] }), msg("m2")]);
        const item = state.ordered[0]!;

        await test.step(`Validate outcome -> Expected: { placeholder: false, links: 1, kind: 'text' } | Received: { placeholder: ${item.placeholder}, links: ${item.rawLinks.length}, kind: '${item.kind}' }`, async () => {
            expect(state.ordered.length, "Shell and rendered row share a data-id and must stay one entry").toBe(2);
            expect(item.placeholder, "Rendered content must clear the placeholder flag").toBe(false);
            expect(item.rawLinks, "Links from the rendered row must be captured").toEqual(["https://a.example/1"]);
            expect(item.kind, "Rendered row kind must replace the shell's unknown kind").toBe("text");
        });
    });

    test("A window with no overlap is reported as a gap and not inserted", async () => {
        const state = createMergeState();
        mergeWindow(state, [msg("m8"), msg("m9")]);
        const result = mergeWindow(state, [msg("m1"), msg("m2")]);

        await test.step(`Validate outcome -> Expected: { gap: true, size: 2 } | Received: { gap: ${result.gap}, size: ${state.ordered.length} }`, async () => {
            expect(result.gap, "Disjoint window must be flagged so the scanner can recover").toBe(true);
            expect(state.ordered.length, "Disjoint window items must not be merged at a guessed position").toBe(2);
        });
    });

    test("New rows that appear below the known range are inserted after their predecessor", async () => {
        const state = createMergeState();
        mergeWindow(state, [msg("m1"), msg("m2"), msg("m3")]);
        mergeWindow(state, [msg("m2"), msg("m2b"), msg("m3"), msg("m4")]);
        const received = keysOf(state.ordered);

        await test.step(`Validate outcome -> Expected: m1,m2,m2b,m3,m4 | Received: ${received.join(",")}`, async () => {
            expect(received, "Late-mounted rows must keep their DOM position").toEqual(["id:m1", "id:m2", "id:m2b", "id:m3", "id:m4"]);
        });
    });

    test("Re-harvested rows upsert: expanded text and late links replace truncated data", async () => {
        const state = createMergeState();
        mergeWindow(state, [msg("m1", { text: "Short", truncated: true })]);
        mergeWindow(state, [msg("m1", { text: "Short and the full body https://a.example/x", rawLinks: ["https://a.example/x"] })]);
        const item = state.ordered[0]!;

        await test.step(`Validate outcome -> Expected: { truncated: false, links: 1 } | Received: { truncated: ${item.truncated}, links: ${item.rawLinks.length} }`, async () => {
            expect(state.ordered.length, "Re-harvest of the same row must not create a second entry").toBe(1);
            expect(item.text, "Longer expanded text must replace the truncated body").toContain("full body");
            expect(item.truncated, "Expanded message must no longer be flagged truncated").toBe(false);
            expect(item.rawLinks, "Links found in the expanded body must be merged in").toEqual(["https://a.example/x"]);
        });
    });

    test("Dates come from the merged stream, including messages whose divider is off-window", async () => {
        const ordered = [
            divider("TUESDAY"),
            msg("a1"),
            divider("YESTERDAY"),
            msg("b1", { prePlainText: "[9:00 am, 30/9/2026] X: " }),
            divider("TODAY"),
            msg("c1"),
            msg("c2", { prePlainText: "[9:00 am, 1/10/2026] X: " }),
        ];
        const order = assignDates(ordered, TODAY);
        const dates = ordered.filter((i) => i.type === "message").map((i) => i.date);

        await test.step(`Validate outcome -> Expected: 2026-09-29,2026-09-30,2026-10-01,2026-10-01 | Received: ${dates.join(",")}`, async () => {
            expect(order, "Day-first order must be inferred from 30/9/2026").toBe("dmy");
            expect(dates, "Each message must inherit its divider date or use its own timestamp").toEqual([
                "2026-09-29",
                "2026-09-30",
                "2026-10-01",
                "2026-10-01",
            ]);
        });
    });

    test("Numeric dates are parsed strictly instead of matching both d/m and m/d", async () => {
        const jan10 = parseNumericDate("[9:00 am, 10/1/2026] X: ", "dmy");
        const detected = detectDateOrder(["[9:00 am, 1/10/2026] X: ", "[9:00 am, 13/9/2026] X: "]);
        const monthName = parseDividerDate("October 1", TODAY, "dmy");

        await test.step(`Validate outcome -> Expected: { jan10: '2026-01-10', order: 'dmy', monthName: '2026-10-01' } | Received: { jan10: '${jan10}', order: '${detected}', monthName: '${monthName}' }`, async () => {
            expect(jan10, "10/1/2026 in d/m order is 10 January, never 'today' on 1 October").toBe("2026-01-10");
            expect(detected, "A day part greater than 12 must decide the date order").toBe("dmy");
            expect(monthName, "Month-name divider without a year resolves to the current year").toBe("2026-10-01");
        });
    });

    test("sliceScope uses the unread divider, and falls back to the badge count", async () => {
        const withMarker = [msg("m1"), msg("m2"), unreadMarker(2), msg("m3"), msg("m4")];
        const withoutMarker = [msg("m1"), msg("m2"), msg("m3"), msg("m4")];
        const viaMarker = keysOf(sliceScope(withMarker, ExtractionScope.UNREAD, 5, TODAY));
        const viaCount = keysOf(sliceScope(withoutMarker, ExtractionScope.UNREAD, 3, TODAY));

        await test.step(`Validate outcome -> Expected: { marker: 'm3,m4', count: 'm2,m3,m4' } | Received: { marker: '${viaMarker.join(",")}', count: '${viaCount.join(",")}' }`, async () => {
            expect(viaMarker, "Messages below the unread divider are the unread set").toEqual(["id:m3", "id:m4"]);
            expect(viaCount, "Without the divider, the newest N messages are the unread set").toEqual(["id:m2", "id:m3", "id:m4"]);
        });
    });
});

for (const mode of ["unmount", "placeholder"] as const) {
test.describe(`Virtualized conversation harvesting (offline fixture, ${mode} mode)`, { tag: ["@logic", "@offline", "@collect-messages"] }, () => {
    const fixtureOptions: FixtureOptions = {
        mode,
        days: [
            { label: "25/09/2026", preDate: "25/9/2026", prefix: "O", count: 10 },
            { label: "TUESDAY", preDate: "29/9/2026", prefix: "U", count: 30 },
            { label: "YESTERDAY", preDate: "30/9/2026", prefix: "Y", count: 60 },
            { label: "TODAY", preDate: "1/10/2026", prefix: "T", count: 100 },
        ],
        unreadCount: 25,
    };
    const fixture = buildVirtualizedChat(fixtureOptions);

    const cases: Array<{ scope: ExtractionScope; unreadCount: number; expectedIds: string[] }> = [
        { scope: ExtractionScope.TODAY, unreadCount: 0, expectedIds: fixture.idsByPrefix["T"]! },
        { scope: ExtractionScope.YESTERDAY, unreadCount: 0, expectedIds: fixture.idsByPrefix["Y"]! },
        { scope: ExtractionScope.UNREAD, unreadCount: 25, expectedIds: fixture.idsByPrefix["T"]!.slice(-25) },
    ];

    for (const c of cases) {
        test(`Harvests exactly the '${c.scope}' messages from a virtualized list`, async ({ page }) => {
            await test.step("Load the virtualized conversation fixture", async () => {
                await page.setViewportSize({ width: 900, height: 760 });
                await page.setContent(fixture.html);
                await highlightElement(page.locator("#scroller"), 200);
            });

            const mountedRows = await test.step("Count the rows that have rendered content", async () => {
                return await page.locator("#main [data-pre-plain-text]").count();
            });

            const result = await test.step(`Scan for scope '${c.scope}'`, async () => {
                return await collectScopeMessagesWithStats(page, c.scope, c.unreadCount, { today: TODAY });
            });

            const receivedIds = result.messages.map((m) => (m.dataId ?? "").replace("false_fixture@g.us_", ""));
            const duplicates = receivedIds.length - new Set(receivedIds).size;
            const byId = new Map(fixture.messages.map((m) => [m.id, m]));
            const missingHiddenLinks = receivedIds.filter((id) => {
                const expected = byId.get(id);
                const got = result.messages.find((m) => m.dataId?.endsWith(id));
                return !!expected && expected.links.some((l) => !got?.rawLinks.includes(l));
            });

            await test.info().attach(`harvest-${mode}-${c.scope}`, {
                body: JSON.stringify({ mountedRows, stats: result.stats, receivedIds, missingHiddenLinks }, null, 2),
                contentType: "application/json",
            });

            await test.step(
                `Validate outcome -> Expected: { count: ${c.expectedIds.length}, duplicates: 0, unrecoveredGaps: 0, placeholdersRemaining: 0, stopReason: 'boundary' } | Received: { count: ${receivedIds.length}, duplicates: ${duplicates}, unrecoveredGaps: ${result.stats.unrecoveredGaps}, placeholdersRemaining: ${result.stats.placeholdersRemaining}, stopReason: '${result.stats.stopReason}' }`,
                async () => {
                    expect(mountedRows, "Fixture must virtualize (render far fewer rows than it holds)").toBeLessThan(30);
                    expect(receivedIds, `Scope '${c.scope}' must contain every message exactly once, oldest -> newest`).toEqual(c.expectedIds);
                    expect(duplicates, "No message may be harvested twice").toBe(0);
                    expect(result.stats.unrecoveredGaps, "Every window must overlap the previous one").toBe(0);
                    expect(result.stats.placeholdersRemaining, "Every scope message must be read with rendered content").toBe(0);
                    expect(result.stats.stopReason, "Scan must stop because it reached the scope boundary").toBe("boundary");
                    expect(missingHiddenLinks, "Links inside 'Read more' bodies must be captured after expansion").toEqual([]);
                }
            );
        });
    }
});
}
