# Research: WhatsApp Locator Validation & Health Check Test Suite

## Executive Summary
This document consolidates architectural investigations, technology evaluations, and design decisions for building the WhatsApp locator validation and health check testing infrastructure.

---

## Topic 1: Playwright Test Runner Architecture & Dual-Suite Configuration

### Decision
Use `@playwright/test` with a dedicated configuration file (`backend/playwright.config.ts`) supporting two distinct test project configurations:
1. **`auth-locators`**: Runs against `https://web.whatsapp.com` with an isolated temporary browser context (no preloaded session), verifying QR code canvas, login cards, and instruction locators.
2. **`chat-locators`**: Launches a persistent browser context pointed at `backend/.whatsapp_session`, validating chat list rows, search input, clear search buttons, conversation headers, message containers, copyable text, date dividers, and embedded URLs.

### Rationale
- `@playwright/test` natively supports multi-project matrixing, trace recording (`trace: 'on'`), video capture (`video: 'on'`), full-page screenshots (`screenshot: 'on'`), and HTML reporting out-of-the-box.
- Isolating fresh login state from persistent session state prevents session invalidation while allowing fast, deterministic assertions for both logged-in and logged-out states.

### Alternatives Considered
- *Custom Node.js runner script*: Using Playwright directly in a standalone TS script would require re-inventing assertion libraries, trace viewers, video managers, and reporting HTML. `@playwright/test` provides standard enterprise-grade tooling.
- *Single unified test file*: Condition-checking inside a single test would create nondeterministic flaky tests if the session state toggles midway.

---

## Topic 2: Centralized Locator Registry & Fallback Cascade Helper

### Decision
Define a typed locator catalog in `backend/src/config/whatsapp_locators.ts` exporting strongly typed `LocatorDefinition` objects:
```typescript
export type ElementCategory = 'auth' | 'navigation' | 'chat_list' | 'conversation_header' | 'messages' | 'links';

export interface LocatorDefinition {
  id: string;
  name: string;
  category: ElementCategory;
  description: string;
  primary: string;
  fallbacks: string[];
  isOptional?: boolean;
}
```
Create a reusable test validation helper `validateLocatorWithFallback(page, locatorDef)` that:
1. Wraps execution in `test.step(`Verifying ${locatorDef.name}`, ...)`
2. Tests `locatorDef.primary`. If visible within a brief timeout (3000ms):
   - Highlights the element on screen with glowing border and 300ms visual dwell.
   - Marks status as `OPERATIONAL (Primary)`.
3. If primary fails:
   - Iterates through `locatorDef.fallbacks`.
   - If a fallback is visible, highlights it and records status as `DEGRADED (Primary Failed, Fallback Working: [selector])`.
   - If all fallbacks fail, marks status as `BROKEN (All Selectors Failed)` and fails the step.

### Rationale
- Primary-first execution keeps test runs lightning-fast (<60 seconds).
- Evaluating fallbacks only on primary failure immediately tells the developer if a fallback already works and can be promoted to primary in production without spending time discovering new selectors.
- The catalog remains clean, declarative TypeScript ready to be imported into `whatsapp_scraper.ts` in future refactoring without breaking changes.

### Alternatives Considered
- *Testing all fallbacks every run*: Greatly increases test execution time and adds noise to trace recordings when the primary locator is completely healthy.

---

## Topic 3: Visual Element Highlighting & Dwell Strategy

### Decision
Implement DOM highlighting using an injected CSS class / inline styling helper:
```typescript
export async function highlightElement(locator: Locator, durationMs = 300): Promise<void> {
  await locator.evaluate((el) => {
    (el as HTMLElement).style.outline = '3px solid #00E676';
    (el as HTMLElement).style.boxShadow = '0 0 12px #00E676';
    (el as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
  });
  await locator.page().waitForTimeout(durationMs);
  await locator.evaluate((el) => {
    (el as HTMLElement).style.outline = '';
    (el as HTMLElement).style.boxShadow = '';
  });
}
```

### Rationale
- Native CSS outline and box-shadow does not trigger DOM layout shifts (unlike adding border or wrapper divs).
- The neon green `#00E676` color matches WhatsApp's brand palette and provides unmistakable contrast in dark and light modes across screenshots, videos, and trace step snapshots.
- A 300ms pause ensures that video recorders and trace frame grabbers capture the highlighted state clearly before assertions conclude.

### Alternatives Considered
- *Playwright's default `locator.highlight()`*: Playwright's native highlight is designed for interactive debugging and may not persist reliably in headless video and trace frames without explicit animation pauses.

---

## Topic 4: npm Script & CLI Orchestration

### Decision
Add standardized test scripts in `backend/package.json`:
- `"test:locators"`: `playwright test --config=playwright.config.ts` (runs all locator tests)
- `"test:locators:auth"`: `playwright test tests/auth-locators.spec.ts --config=playwright.config.ts`
- `"test:locators:chat"`: `playwright test tests/chat-locators.spec.ts --config=playwright.config.ts`
- `"test:locators:report"`: `playwright show-report`

And delegate from root `package.json`:
- `"test:locators"`: `npm --prefix backend run test:locators`

### Rationale
- Conforms with JobShortcut project conventions (`npm --prefix backend run ...`).
- Developers can quickly execute specific suites during local iteration or check the visual HTML report.
