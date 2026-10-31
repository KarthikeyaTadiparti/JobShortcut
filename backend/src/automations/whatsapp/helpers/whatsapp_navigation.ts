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
        const clearBtnSelectors = getLocatorSelectors(WHATSAPP_LOCATORS.chatListSearchClearBtn);
        for (const sel of clearBtnSelectors) {
            const btn = page.locator(sel).first();
            if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
                await btn.click({ force: true }).catch(() => { });
                await page.waitForTimeout(100);
                break;
            }
        }

        // 3. Fallback: If search input is visible and still contains text, select all and backspace
        const inputLoc = page.locator(searchInputSelector).first();
        if ((await inputLoc.count()) > 0 && (await inputLoc.isVisible().catch(() => false))) {
            const currentVal = await inputLoc.inputValue().catch(() => "");
            if (currentVal && currentVal.length > 0) {
                await inputLoc.focus().catch(() => {});
                await page.keyboard.press("ControlOrMeta+A").catch(() => {});
                await page.keyboard.press("Backspace").catch(() => {});
                await page.waitForTimeout(100);
            }
        }
    } catch {
        // Non-fatal sanitization error
    }
}

/**
 * Switches WhatsApp Web navigation to the Chats tab if not already active.
 */
export async function navigateToChatsTab(page: Page): Promise<void> {
    try {
        const chatsListSel = getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer);
        const channelsListSel = getCombinedSelector(WHATSAPP_LOCATORS.channelsListContainer);

        const isChatsView = await page.evaluate(({ chats, channels }) => {
            const pane = document.querySelector(chats);
            const channelsHeader = document.querySelector(channels);
            return !!pane && !channelsHeader;
        }, { chats: chatsListSel, channels: channelsListSel });

        if (isChatsView) return;

        const chatsTabSelectors = getLocatorSelectors(WHATSAPP_LOCATORS.chatsTabBtn);

        for (const sel of chatsTabSelectors) {
            const tab = page.locator(sel).first();
            if ((await tab.count()) > 0 && (await tab.isVisible().catch(() => false))) {
                await tab.click({ force: true }).catch(() => { });
                await page.waitForTimeout(600);
                break;
            }
        }
    } catch {
        // Non-fatal navigation issue
    }
}

/**
 * Switches WhatsApp Web navigation to the Channels / Updates sidebar rail view if not already active.
 */
export async function navigateToChannelsTab(page: Page): Promise<boolean> {
    try {
        const channelsListSel = getCombinedSelector(WHATSAPP_LOCATORS.channelsListContainer);

        const isAlreadyChannels = await page.evaluate((selector) => {
            return !!document.querySelector(selector);
        }, channelsListSel);

        if (isAlreadyChannels) return true;

        const channelsTabSelectors = getLocatorSelectors(WHATSAPP_LOCATORS.channelsTabBtn);

        for (const sel of channelsTabSelectors) {
            const tab = page.locator(sel).first();
            if ((await tab.count()) > 0 && (await tab.isVisible().catch(() => false))) {
                await tab.click({ force: true }).catch(() => { });
                await page.waitForTimeout(1000);
                return true;
            }
        }

        // Fallback check
        return await page.evaluate((selector) => {
            return !!document.querySelector(selector);
        }, channelsListSel);
    } catch (err) {
        console.warn("Failed to navigate to Channels tab:", err);
        return false;
    }
}
