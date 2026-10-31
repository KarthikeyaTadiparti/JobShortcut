# Quickstart: WhatsApp Job Link Scraper

This guide details the validation and execution workflows to verify the WhatsApp Job Link Scraper end-to-end.

---

## Prerequisites

1. **Node.js**: Ensure Node.js (v18+) is installed.
2. **Dependencies**: Ensure backend and frontend dependencies are installed:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Playwright Browsers**: Ensure Playwright Chromium binary is available:
   ```bash
   npx playwright install chromium
   ```
4. **Environment Variables**:
   - `backend/.env`: Configured with Neon database URL and JWT secrets.
   - `frontend/.env`: Configured with `VITE_API_URL` pointing to the backend (e.g., `http://localhost:5000`).

---

## Running the Application

### 1. Start Backend Server
```bash
cd backend
npm run dev
```
*Backend runs at `http://localhost:5000` (or configured port).*

### 2. Start Frontend Server
```bash
cd frontend
npm run dev
```
*Frontend client runs at `http://localhost:5173`.*

---

## Validation Scenarios

### Scenario 1: CLI Direct WhatsApp Scraper Run (Backend Verification)

Test the WhatsApp scraping engine directly from the command line:

```bash
cd backend
npm run scrape:whatsapp
```

**Expected Outcome**:
1. Playwright opens WhatsApp Web (headless or with QR prompt in terminal/window if unauthenticated).
2. It evaluates configured groups (`Jobcode 37`, `Fresher Openings - 86`, etc.).
3. Detects unread badges or date ranges, opens group, scrolls conversation down, verifies rendered count $\ge N$, and extracts matching domain links.
4. Outputs the final aggregated deduplicated array `string[]` of URLs in the console.

---

### Scenario 2: Admin Dashboard "Import from WhatsApp" One-Click Flow

1. Log into the Admin portal (`http://localhost:5173/login`).
2. Navigate to the **Job Scraper** page (`http://localhost:5173/admin/scraper`).
3. Click the new **"Import from WhatsApp"** button.
4. In the dialog modal:
   - Select scope: **`Unread`** (or **`Today`** / **`Yesterday`**).
   - Click **"Start Import"**.
5. Observe live SSE progress updates in the modal.
6. Once complete:
   - Extracted job links are automatically populated into the **Job URLs** textarea.
   - Success toast notification displays the count of imported links.
7. Click **"Start Scraping"** to immediately parse all imported URLs into the Job Details approval cards.

---

### Scenario 3: First-Time Login / QR Code Verification Flow

1. With a fresh/empty session directory (`backend/.whatsapp_session/` cleared):
2. Click **"Import from WhatsApp"** on the Scraper page.
3. The modal receives the `qr` event and renders the live WhatsApp QR code.
4. Open WhatsApp on your mobile device -> **Linked Devices** -> **Link a Device**.
5. Scan the QR code displayed in the browser modal.
6. The modal transitions to `"Authenticated"` status and immediately proceeds with group link extraction.
7. Future runs will reuse this persistent session without requesting QR scan again.

---

### Scenario 4: Error & Edge Case Resilience Check

1. **Group with 0 unread messages**: Verify the scraper detects 0 unread and skips the group cleanly in under 3 seconds.
2. **Missing Group**: Verify searching a non-existent group name logs a descriptive warning without terminating remaining groups.
3. **Virtualization safeguard**: Verify that if rendered messages < unread count, a warning is logged and partial links are not incorrectly returned.
