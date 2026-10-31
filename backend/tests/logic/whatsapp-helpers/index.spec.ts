import fs from "fs";
import os from "os";
import path from "path";
import { test, expect } from "@playwright/test";
import { chatNameMatchLevel } from "@/automations/whatsapp/helpers/whatsapp_search.js";
import { isUnreadReadingConfirmed, type ListRowInfo } from "@/automations/whatsapp/helpers/whatsapp_open_chat.js";
import { extractSourceLinks, isMatchingDomain } from "@/automations/whatsapp/helpers/whatsapp_links.js";
import { DEFAULT_WHATSAPP_SOURCES } from "@/automations/whatsapp/config/whatsapp_sources.js";
import { describeHarvestIssues } from "@/automations/whatsapp/helpers/whatsapp_scope_report.js";
import {
    assignDates,
    resolveDateOrder,
    type HarvestItem,
} from "@/automations/whatsapp/helpers/whatsapp_message_merge.js";
import { evaluateWindowMessages, type HarvestStats } from "@/automations/whatsapp/helpers/whatsapp_harvester.js";
import { launchWhatsAppContext, checkWhatsAppAuthState, WhatsAppSessionBusyError } from "@/automations/whatsapp/whatsapp_session.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";

const msg = (id: string, prePlainText: string): HarvestItem => ({
    key: `id:${id}`,
    type: "message",
    dataId: id,
    text: `text ${id}`,
    prePlainText,
    rawLinks: [],
    kind: "text",
    truncated: false,
    placeholder: false,
    dividerText: "",
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

const row = (unreadCount: number, loading: boolean): ListRowInfo => ({
    index: 0,
    title: "Jobcode 37",
    unreadCount,
    loading,
});

const completeStats = (overrides: Partial<HarvestStats> = {}): HarvestStats => ({
    windows: 4,
    gapRetries: 0,
    unrecoveredGaps: 0,
    placeholdersRemaining: 0,
    truncatedRemaining: 0,
    totalItems: 20,
    totalMessages: 17,
    scopedMessages: 6,
    dateOrder: "dmy",
    stopReason: "boundary",
    durationMs: 5000,
    ...overrides,
});

test.describe("WhatsApp helper logic (offline)", { tag: ["@logic", "@offline"] }, () => {
    test("Chat names match only the configured chat, never a sibling or a partial name", async () => {
        const cases = [
            { title: "Fresher Openings - 86", source: "Fresher Openings - 86", expected: 3 },
            { title: "Fresher Openings - 85", source: "Fresher Openings - 86", expected: 0 },
            { title: "Fresher Openings", source: "Fresher Openings - 86", expected: 1 },
            { title: "Jobcode 37 (Official)", source: "Jobcode 37", expected: 2 },
            { title: "Jobcode", source: "Jobcode 37", expected: 0 },
            { title: "Freshersdunia.in - Freshers Job - Off Campus Drive", source: "39 -Freshersdunia.in - Freshers Job - Off Campus Drive", expected: 1 },
        ];
        const received = cases.map((c) => ({ ...c, level: chatNameMatchLevel(c.title, c.source) }));
        await test.info().attach("chat-name-match-levels", { body: JSON.stringify(received, null, 2), contentType: "application/json" });

        await test.step(`Validate outcome -> Expected: levels ${cases.map((c) => c.expected).join(",")} | Received: levels ${received.map((r) => r.level).join(",")}`, async () => {
            for (const r of received) {
                expect(r.level, `'${r.title}' vs source '${r.source}' must have match level ${r.expected}`).toBe(r.expected);
            }
        });
    });

    test("A zero unread count is trusted only after the chat row stops loading", async () => {
        const cases = [
            { name: "badge visible while loading", previous: undefined, current: row(5, true), expected: true },
            { name: "first poll, no badge, loading", previous: undefined, current: row(0, true), expected: false },
            { name: "no badge, loading on both polls", previous: row(0, true), current: row(0, true), expected: false },
            { name: "loaded now but was loading before", previous: row(0, true), current: row(0, false), expected: false },
            { name: "first poll after loading, nothing to compare", previous: undefined, current: row(0, false), expected: false },
            { name: "loaded and unchanged on two polls", previous: row(0, false), current: row(0, false), expected: true },
            { name: "badge appears once loading finishes", previous: row(0, true), current: row(3, false), expected: true },
        ];
        const received = cases.map((c) => ({ name: c.name, expected: c.expected, confirmed: isUnreadReadingConfirmed(c.previous, c.current) }));
        await test.info().attach("unread-reading-confirmation", { body: JSON.stringify(received, null, 2), contentType: "application/json" });

        await test.step(`Validate outcome -> Expected: confirmed ${cases.map((c) => c.expected).join(",")} | Received: confirmed ${received.map((r) => r.confirmed).join(",")}`, async () => {
            for (const r of received) {
                expect(r.confirmed, `Case '${r.name}' must be ${r.expected ? "confirmed" : "unconfirmed (keep waiting, never skip the chat)"}`).toBe(r.expected);
            }
        });
    });

    test("Links must be on the source domain and collapse tracking variants", async () => {
        const source = { targetDomain: "jobcode.in" };
        const links = extractSourceLinks(
            [
                "https://www.jobcode.in/post/123/?utm_source=whatsapp",
                "https://jobcode.in/post/123",
                "https://careers.jobcode.in/apply?jobid=9&ref=wa",
                "https://example.com/post/1",
            ],
            source
        );
        const parentDomain = isMatchingDomain("https://co.in/x", { targetDomain: "freshersrecruitment.co.in" });
        await test.info().attach("extracted-links", { body: JSON.stringify({ links, parentDomain }, null, 2), contentType: "application/json" });

        await test.step(`Validate outcome -> Expected: { unique: 2, parentDomainMatch: false } | Received: { unique: ${new Set(links).size}, parentDomainMatch: ${parentDomain} }`, async () => {
            expect(new Set(links), "Tracking/www/trailing-slash variants must normalize to one URL, other domains dropped").toEqual(
                new Set(["https://jobcode.in/post/123", "https://careers.jobcode.in/apply?jobid=9"])
            );
            expect(parentDomain, "A parent domain of the target ('co.in' for 'x.co.in') must not match").toBe(false);
        });
    });

    test("Homepages and site-chrome links are dropped, job posts on the source domain are kept", async () => {
        const sourceFor = (domain: string) => {
            const source = DEFAULT_WHATSAPP_SOURCES.find((src) => src.targetDomain === domain);
            if (!source) throw new Error(`No default source for ${domain}`);
            return source;
        };
        const keep = {
            "placement-officer.com": [
                "https://placement-officer.com/2026/10/cloudseed-generative-ai-intern-2026.html",
                "https://placement-officer.com/2026/10/another-role.html",
            ],
            "freshersdunia.in": [
                "https://freshersdunia.in/tcs-ion-national-qualifier-test-2026-freshers",
                "https://freshersdunia.in/deloitte-mega-hiring-2026-2",
                "https://freshersdunia.in/infosys-campus-recruitment-2027",
            ],
            "freshershunt.in": ["https://freshershunt.in/infosys-off-campus-drive-2027"],
            "foundthejob.com": ["https://foundthejob.com/larsen-toubro-off-campus-drive-2026"],
        };
        const drop = {
            "placement-officer.com": [
                "http://placement-officer.com/",
                "https://placement-officer.com/p/contact.html",
                "https://placement-officer.com/search/label/freshers",
            ],
            "freshersdunia.in": ["https://freshersdunia.in/whatsapp", "https://freshersdunia.in/telegram", "https://freshersdunia.in/"],
            "freshershunt.in": ["https://freshershunt.in/WhatsApp", "https://freshershunt.in/category/it-jobs"],
            "foundthejob.com": ["https://foundthejob.com", "https://foundthejob.com/about-us/"],
        };
        const received = Object.keys(keep).map((domain) => {
            const key = domain as keyof typeof keep;
            const input = keep[key].map((url) => url.replace("://placement-officer.com/2026/10/another-role", "://www.placement-officer.com/2026/10/another-role"));
            const links = extractSourceLinks([...drop[key], ...input], sourceFor(domain));
            return { domain, expected: keep[key], links };
        });
        await test.info().attach("filtered-job-links", { body: JSON.stringify(received, null, 2), contentType: "application/json" });

        const keptCount = received.reduce((n, r) => n + r.links.length, 0);
        const expectedCount = Object.values(keep).reduce((n, list) => n + list.length, 0);
        await test.step(`Validate outcome -> Expected: { kept: ${expectedCount}, junk: 0 } | Received: { kept: ${keptCount}, domains: '${received.map((r) => `${r.domain}=${r.links.length}`).join(" ")}' }`, async () => {
            for (const r of received) {
                expect(r.links, `${r.domain}: only job-post URLs may survive; homepages, /whatsapp, /telegram, category and non-matching paths must be dropped`).toEqual(r.expected);
            }
        });
    });

    test("Auth check keeps waiting while WhatsApp shows its loading screen", async ({ page }) => {
        const loadingThenChats =
            "<body><progress></progress><script>setTimeout(function(){document.body.innerHTML='<div id=\"side\" style=\"width:200px;height:200px\">chats</div>'},3000)</script></body>";
        const nothingRecognised = "<body><h2>Some other screen</h2></body>";
        const serve = async (html: string) => {
            await page.unroute("https://web.whatsapp.com/**");
            await page.route("https://web.whatsapp.com/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
            await page.goto("https://web.whatsapp.com/");
        };

        let slow: Awaited<ReturnType<typeof checkWhatsAppAuthState>> | undefined;
        await test.step("Open a WhatsApp page that stays on the loading screen for 3s, with a 1s wait budget", async () => {
            await serve(loadingThenChats);
            await highlightElement(page.locator("progress"));
            slow = await checkWhatsAppAuthState(page, 1000);
        });

        let unknown: Awaited<ReturnType<typeof checkWhatsAppAuthState>> | undefined;
        let unknownMs = 0;
        await test.step("Open a page with no chat list, QR code or loading screen, with a 1s wait budget", async () => {
            await serve(nothingRecognised);
            const started = Date.now();
            unknown = await checkWhatsAppAuthState(page, 1000);
            unknownMs = Date.now() - started;
        });

        await test.info().attach("auth-check-results", { body: JSON.stringify({ slow, unknown, unknownMs }, null, 2), contentType: "application/json" });

        await test.step(`Validate outcome -> Expected: { slowAuthenticated: true, unknownAuthenticated: false, unknownWithin: 5000ms } | Received: { slowAuthenticated: ${slow?.authenticated}, unknownAuthenticated: ${unknown?.authenticated}, unknownMs: ${unknownMs} }`, async () => {
            expect(slow?.authenticated, "A page still on WhatsApp's loading screen must be waited out, not reported as not logged in").toBe(true);
            expect(unknown?.authenticated, "A page with no chat list must not count as logged in").toBe(false);
            expect(unknownMs, "With no loading screen visible, the check must give up near the 1s budget instead of waiting up to the loading limit").toBeLessThan(5000);
        });
    });

    test("Ambiguous timestamps take their date order from the Today divider", async () => {
        // On 2 October, "2/10/2026" under "Today" can only be day-first.
        const dayFirst = [divider("TODAY"), msg("a", "[9:00 am, 2/10/2026] A: ")];
        const dayFirstOrder = resolveDateOrder(dayFirst, new Date(2026, 9, 2, 12));
        // On 10 February, the same text under "Today" can only be month-first.
        const monthFirst = [divider("TODAY"), msg("b", "[9:00 am, 2/10/2026] A: ")];
        const monthFirstOrder = assignDates(monthFirst, new Date(2026, 1, 10, 12));
        const monthFirstDate = monthFirst[1]!.date;

        await test.step(`Validate outcome -> Expected: { dayFirst: 'dmy', monthFirst: 'mdy', date: '2026-02-10' } | Received: { dayFirst: '${dayFirstOrder}', monthFirst: '${monthFirstOrder}', date: '${monthFirstDate}' }`, async () => {
            expect(dayFirstOrder, "Under Today on 2 Oct, 2/10/2026 must be read day-first").toBe("dmy");
            expect(monthFirstOrder, "Under Today on 10 Feb, 2/10/2026 must be read month-first").toBe("mdy");
            expect(monthFirstDate, "The message must be dated today, not 2 October").toBe("2026-02-10");
        });
    });

    test("Incomplete harvests are reported instead of passing as success", async () => {
        const complete = describeHarvestIssues(completeStats());
        const partial = describeHarvestIssues(completeStats({ stopReason: "timeout", durationMs: 180000, truncatedRemaining: 2 }));

        await test.step(`Validate outcome -> Expected: { complete: undefined, partial mentions timeout and truncation } | Received: { complete: ${complete}, partial: '${partial}' }`, async () => {
            expect(complete, "A complete harvest must produce no warning").toBeUndefined();
            expect(partial, "A timed-out harvest must say it hit the time limit").toContain("time limit");
            expect(partial, "Unexpanded long messages must be reported").toContain("could not be expanded");
        });
    });

    test("Message text keeps emoji and line breaks", async ({ page }) => {
        await test.step("Render a minimal conversation with an emoji image", async () => {
            await page.setContent(`
                <div id="main">
                  <div id="scroller" style="height: 200px; overflow-y: auto;">
                    <div style="height: 400px;">
                      <div role="row"><div data-id="false_x@g.us_M1">
                        <div class="copyable-text" data-pre-plain-text="[9:00 am, 2/10/2026] A: ">
                          <span class="selectable-text">Hiring <img class="emoji" alt="X" data-plain-text="&#x1F680;"> now<br>Apply https://jobs.example.com/a</span>
                        </div>
                      </div></div>
                    </div>
                  </div>
                </div>`);
            await highlightElement(page.locator("#scroller"), 200);
        });

        const messages = await test.step("Read the window", async () => evaluateWindowMessages(page, new Date(2026, 9, 2, 12)));
        const text = messages[0]?.text ?? "";
        await test.info().attach("window-messages", { body: JSON.stringify(messages, null, 2), contentType: "application/json" });

        await test.step(`Validate outcome -> Expected: 'Hiring \u{1F680} now' + newline + link | Received: ${JSON.stringify(text)}`, async () => {
            expect(messages.length, "Exactly one message must be read").toBe(1);
            expect(text, "Emoji rendered as <img> must be kept in the text").toContain("Hiring \u{1F680} now");
            expect(text.split("\n")[1], "<br> must become a line break").toBe("Apply https://jobs.example.com/a");
        });
    });

    test("Only one automation can hold a WhatsApp session at a time", async () => {
        const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), "wa-lock-"));
        try {
            const first = await test.step("Launch the first context", async () => launchWhatsAppContext({ headless: true, sessionDir }));

            const secondError = await test.step("Try a second context on the same session", async () => {
                try {
                    const second = await launchWhatsAppContext({ headless: true, sessionDir });
                    await second.context.close();
                    return null;
                } catch (err) {
                    return err;
                }
            });

            await first.context.close();
            const third = await test.step("Launch again after the first context closed", async () => launchWhatsAppContext({ headless: true, sessionDir }));
            await third.context.close();

            // A lock left by a process that no longer exists must not block forever.
            fs.writeFileSync(path.join(sessionDir, "automation.lock"), JSON.stringify({ pid: 999999, startedAt: "stale" }));
            const reclaimed = await test.step("Launch over a stale lock", async () => launchWhatsAppContext({ headless: true, sessionDir }));
            await reclaimed.context.close();

            await test.step(`Validate outcome -> Expected: { secondLaunch: 'WhatsAppSessionBusyError' } | Received: { secondLaunch: '${(secondError as Error | null)?.name ?? "succeeded"}' }`, async () => {
                expect(secondError, "A second launch on a held session must fail with a busy error").toBeInstanceOf(WhatsAppSessionBusyError);
                expect(fs.existsSync(path.join(sessionDir, "automation.lock")), "Closing the context must release the lock").toBe(false);
            });
        } finally {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    });
});
