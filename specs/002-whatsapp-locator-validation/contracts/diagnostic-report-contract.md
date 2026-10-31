# Diagnostic Locator Report Contract

This document defines the schema and format for terminal and artifact reports generated during test validation.

## 1. Terminal Console Summary Format
When running `npm run test:locators`, the test runner outputs a formatted health table:

```text
================================================================================
           WHATSAPP WEB LOCATOR HEALTH DIAGNOSTIC REPORT
================================================================================
Timestamp: 2026-09-26T21:40:00.000Z
Suite: chat-locators
Target Session: backend/.whatsapp_session

ID                         NAME                         STATUS       ACTIVE SELECTOR
--------------------------------------------------------------------------------
chatListSearchInput        Search Input Box             OPERATIONAL  #side div[data-testid="chat-list-search-container"] [contenteditable="true"]
chatListSearchClearBtn     Clear Search Button          OPERATIONAL  #side [data-testid="chat-list-search-container"] button
chatListContainer          Chat List Main Container     OPERATIONAL  #pane-side
chatListRow                Chat List Row Item           OPERATIONAL  #pane-side [role="row"]
chatRowTitle               Chat Row Title Span          OPERATIONAL  [data-testid="cell-frame-title"] span
chatRowUnreadBadge         Unread Message Badge         OPERATIONAL  [data-testid="icon-unread-count"]
conversationHeader         Conversation Header          OPERATIONAL  #main header
conversationChatTitle      Conversation Chat Title      OPERATIONAL  #main [data-testid="conversation-info-header-chat-title"]
conversationPanelMessages  Message Panel Scroll Area    OPERATIONAL  #main [data-testid="conversation-panel-messages"]
messageContainer           Message Bubble Container     OPERATIONAL  #main div[data-testid="msg-container"]
copyableText               Copyable Message Text Span   DEGRADED     #main [data-pre-plain-text] (Fallback #1)
dateDividerSpan            Date Divider Span            OPERATIONAL  #main div[tabindex='-1'] span[dir='auto']
messageAnchorLink          Message Hyperlink Anchor     OPERATIONAL  #main [data-testid="msg-container"] a[href]
--------------------------------------------------------------------------------
Summary: 13 Total | 12 Operational | 1 Degraded (Fallback Active) | 0 Broken
Health Score: 100% Functional (92.3% Primary)
================================================================================
```

## 2. Status Definitions

- **`OPERATIONAL`**: Primary selector resolved and is visible. Fallback selectors were not needed and skipped.
- **`DEGRADED`**: Primary selector failed to match or was not visible, but an ordered fallback selector successfully matched and passed. Requires updating the primary selector in `whatsapp_locators.ts`.
- **`BROKEN`**: Both primary and all fallback selectors failed to match. Scraper flow for this element is at critical risk.
- **`SKIPPED`**: Optional element was not present in the current DOM state (e.g. no unread badges or no links currently on screen).
