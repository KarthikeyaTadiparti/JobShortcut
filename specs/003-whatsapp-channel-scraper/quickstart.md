# Quickstart & Verification Guide: WhatsApp Channels Integration

**Feature**: WhatsApp Channels Job Link Extraction (`003-whatsapp-channel-scraper`)  
**Date**: 2026-09-27  

---

## 1. Prerequisites

1. Active WhatsApp Web session in `.whatsapp-session` (or authenticate via QR code on first run).
2. Follow the default test channels in WhatsApp Web:
   - `Found The Job Alerts`
   - `Freshershunt`
   - `Job Update With FoundtheJob`

---

## 2. CLI Execution & Validation

Run the WhatsApp scraper CLI directly from the backend directory to test the unified extraction pipeline:

```bash
# Navigate to backend
cd backend

# 1. Run dry-run / channel extraction under 'today' scope
npm run scrape:whatsapp -- --scope=today

# 2. Run unread scope test
npm run scrape:whatsapp -- --scope=unread

# 3. Run locator report validation
npm run test:locators:report
```

### Expected CLI Output

```text
[WhatsApp] Checking authentication state... Authenticated.
[WhatsApp] Processing 4 groups and 3 channels (Scope: today)...
[WhatsApp] [Group 1/4] 'Jobcode 37' -> 2 links extracted.
...
[WhatsApp] Navigating to Channels / Updates tab...
[WhatsApp] [Channel 1/3] 'Found The Job Alerts' -> 3 links extracted.
[WhatsApp] [Channel 2/3] 'Freshershunt' -> 4 links extracted.
[WhatsApp] [Channel 3/3] 'Job Update With FoundtheJob' -> 2 links extracted.
[WhatsApp] Aggregated 11 unique links across 7 sources.
```

---

## 3. Admin UI End-to-End Verification

1. Start backend dev server:
   ```bash
   cd backend && npm run dev
   ```
2. Start frontend dev server:
   ```bash
   cd frontend && npm run dev
   ```
3. Navigate to `http://localhost:5173/admin/scraper`.
4. Click **Import from WhatsApp**.
5. Select **Today** or **Unread** and click **Start Import**.
6. Observe the live SSE stream displaying:
   - Group progress indicators
   - Transition to Channels tab
   - Channel progress indicators (`Found The Job Alerts`, `Freshershunt`, etc.)
   - Successful completion modal
7. Verify that the **URLs Input Textarea** is automatically populated with deduplicated URLs from both groups and channels.
