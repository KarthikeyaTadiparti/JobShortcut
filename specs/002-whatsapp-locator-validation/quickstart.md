# Quickstart Guide: WhatsApp Locator Validation & Health Check

This guide explains how to execute the WhatsApp locator validation test suite, inspect execution traces, review element highlights, and troubleshoot selector drift.

---

## 1. Prerequisites

1. Ensure dependencies are installed in `backend/`:
   ```bash
   cd backend
   npm install
   ```
2. Ensure Playwright browser binaries are installed:
   ```bash
   npx playwright install chromium
   ```

---

## 2. Running Locator Health Checks

### Run All Locator Suites
From the project root:
```bash
npm run test:locators
```
Or from within the `backend/` directory:
```bash
npm run test:locators
```

### Run Login / Authentication Locators Only
Validates the QR code canvas, login instruction headers, and authentication card selectors in a clean unauthenticated session:
```bash
npm run test:locators:auth
```

### Run Chat & Message Locators Only
Validates search inputs, chat list rows, conversation headers, message bubbles, date dividers, and links against the active persistent profile in `backend/.whatsapp_session`:
```bash
npm run test:locators:chat
```

### Run in Headed Mode (Watch Browser Live)
```bash
npx playwright test tests/chat-locators.spec.ts --headed
```

---

## 3. Viewing Traces, Screenshots, and Recordings

Every test run automatically captures:
- Full Playwright trace files with step descriptions and DOM snapshots
- Video recordings of test executions showing the glowing green element highlights
- Screenshots of verified elements

To view the interactive HTML report and trace viewer:
```bash
npm run test:locators:report
```

---

## 4. Live DOM Extraction & Verification Utility

To dump the live DOM and inspect selector matches outside of the test runner:
```bash
# Run headless DOM extraction on default group (Jobcode 37)
npm run extract:dom

# Run in headed mode with browser visible
npm run extract:dom -- --headed

# Run on a custom group or conversation
npm run extract:dom -- --headed --group="Jobcode 37"
```

Artifacts generated in `backend/artifacts/`:
- `whatsapp_dom_snapshot.html`: Full page DOM snapshot
- `whatsapp_dom_side_pane.html`: Scoped Left Pane DOM (`#side`)
- `whatsapp_dom_main_chat.html`: Scoped Active Chat DOM (`#main`)
- `whatsapp_dom_report.json`: JSON health report with matched selectors and DOM attributes

---

## 5. Understanding Locator Diagnostic Outcomes

- **`OPERATIONAL` (Green)**: Primary selector is working as expected.
- **`DEGRADED` (Yellow)**: Primary selector failed (WhatsApp likely modified markup), but a fallback selector successfully matched. The report will identify which fallback worked so you can update `primary` in `backend/src/config/whatsapp_locators.ts`.
- **`BROKEN` (Red)**: All selectors failed. Inspect the trace in the Playwright report, extract the new WhatsApp DOM attributes, and update `whatsapp_locators.ts`.
