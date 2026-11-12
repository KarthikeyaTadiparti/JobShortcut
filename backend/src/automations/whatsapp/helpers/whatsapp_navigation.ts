import { type Page } from "playwright";
import {
    WHATSAPP_LOCATORS,
    getLocatorSelectors,
    getCombinedSelector,
} from "@/automations/whatsapp/config/whatsapp_locators.js";

/**
 * Helper to pause execution with a randomized human-like jitter duration.
 */
export async function randomJitter(minMs = 300, maxMs = 700): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Ensures any active search or filter input state is cleanly sanitized and reset prior to typing.
 * Handles React controlled inputs, clear buttons, and contenteditable boxes without triggering global view dismissals.
 */
export async function clearActiveSearchInput(page: Page): Promise<void> {
    try {
        const searchInputSelector = `${getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput)}, ${getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput)}`;

        // 1. Clear any active search input element via React-compatible native property setter
        await page.evaluate((selector) => {
            const inputs = document.querySelectorAll(selector);
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;

            for (const input of Array.from(inputs)) {
                const el = input as HTMLElement;
                if (nativeSetter && 'value' in el) {
                    nativeSetter.call(el, '');
                } else if ('value' in el) {
                    (el as HTMLInputElement).value = '';
                }
                el.textContent = '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, searchInputSelector).catch(() => false);

        // 2. Locate and click any search clear / cancel button inside the search container
        const clearBtnSelectors = [
            ...getLocatorSelectors(WHATSAPP_LOCATORS.chatListSearchClearBtn),
            '[data-testid="newsletter-tab-drawer"] button[aria-label*="Cancel" i]',
            '[data-testid="newsletter-tab-drawer"] button[aria-label*="Clear" i]',
            '[data-testid="newsletter-tab-drawer"] button[aria-label*="End icon" i]',
            '[data-testid="newsletter-drawer"] button[aria-label*="Cancel" i]',
        ];
        for (const sel of clearBtnSelectors) {
            const btn = page.locator(sel).first();
            if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
                await btn.click({ force: true }).catch(() => { });
                await page.waitForTimeout(100);
                break;
            }
        }

        // 3. Fallback: If any visible search input still contains text, select all and backspace
        const inputLocs = page.locator(searchInputSelector);
        const inputCount = await inputLocs.count().catch(() => 0);
        for (let i = 0; i < inputCount; i++) {
            const inputLoc = inputLocs.nth(i);
            if (await inputLoc.isVisible().catch(() => false)) {
                const currentVal = await inputLoc.inputValue().catch(() => "");
                if (currentVal && currentVal.length > 0) {
                    await inputLoc.focus().catch(() => {});
                    await page.keyboard.press("ControlOrMeta+A").catch(() => {});
                    await page.keyboard.press("Backspace").catch(() => {});
                    await page.waitForTimeout(100);
                }
            }
        }
    } catch {
        // Non-fatal sanitization error
    }
}

/**
 * True when at least one element matching the selector is rendered with non-zero size and visible.
 */
async function isAnyElementVisible(page: Page, selector: string): Promise<boolean> {
    return await page.evaluate((sel) => {
        return Array.from(document.querySelectorAll(sel)).some((el) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        });
    }, selector).catch(() => false);
}

/**
 * True when the Channels drawer/list view is visibly active on screen.
 */
export async function isChannelsViewActive(page: Page): Promise<boolean> {
    const channelsListSel = getCombinedSelector(WHATSAPP_LOCATORS.channelsListContainer);
    return await isAnyElementVisible(page, channelsListSel);
}

/**
 * True when the Chats list view is visibly active (and not covered by the Channels drawer).
 */
export async function isChatsViewActive(page: Page): Promise<boolean> {
    const chatsListSel = getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer);
    const hasChats = await isAnyElementVisible(page, chatsListSel);
    if (!hasChats) return false;
    return !(await isChannelsViewActive(page));
}

async function waitForViewCondition(check: () => Promise<boolean>, timeoutMs = 4000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) return true;
        await new Promise((r) => setTimeout(r, 200));
    }
    return await check();
}

/**
 * Switches WhatsApp Web navigation to the Chats tab if not already active.
 */
export async function navigateToChatsTab(page: Page): Promise<boolean> {
    try {
        if (await isChatsViewActive(page)) return true;

        const chatsTabSelectors = getLocatorSelectors(WHATSAPP_LOCATORS.chatsTabBtn);

        for (const sel of chatsTabSelectors) {
            const tab = page.locator(sel).first();
            if ((await tab.count()) > 0 && (await tab.isVisible().catch(() => false))) {
                try {
                    await tab.click({ timeout: 3000 });
                } catch {
                    await tab.click({ force: true }).catch(() => { });
                }
                if (await waitForViewCondition(() => isChatsViewActive(page), 4000)) {
                    return true;
                }
            }
        }

        return await isChatsViewActive(page);
    } catch {
        return false;
    }
}

/**
 * Switches WhatsApp Web navigation to the Channels / Updates sidebar rail view if not already active.
 */
export async function navigateToChannelsTab(page: Page): Promise<boolean> {
    try {
        if (await isChannelsViewActive(page)) return true;

        const combinedTabSel = getCombinedSelector(WHATSAPP_LOCATORS.channelsTabBtn);
        await page.locator(combinedTabSel).first().waitFor({ state: "visible", timeout: 5000 }).catch(() => { });

        const channelsTabSelectors = getLocatorSelectors(WHATSAPP_LOCATORS.channelsTabBtn);

        for (const sel of channelsTabSelectors) {
            const loc = page.locator(sel);
            const count = await loc.count().catch(() => 0);
            for (let i = 0; i < count; i++) {
                const tab = loc.nth(i);
                if (await tab.isVisible().catch(() => false)) {
                    try {
                        await tab.click({ timeout: 3000 });
                    } catch {
                        await tab.click({ force: true }).catch(() => { });
                    }
                    if (await waitForViewCondition(() => isChannelsViewActive(page), 4000)) {
                        return true;
                    }
                }
            }
        }

        return await isChannelsViewActive(page);
    } catch (err) {
        console.warn("Failed to navigate to Channels tab:", err);
        return false;
    }
}
