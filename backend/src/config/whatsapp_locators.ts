/**
 * Centralized catalog and registry of all WhatsApp Web UI locators.
 *
 * Each entry defines:
 * - id: unique identifier
 * - name: human-friendly label for step reporting
 * - category: functional category
 * - description: operational purpose
 * - primary: active primary Playwright selector string
 * - fallbacks: prioritized array of alternative fallback selector strings
 * - isOptional: boolean flag indicating if element may be conditionally absent (e.g. unread badge)
 * - requiresParent: optional parent scope selector
 */

export type ElementCategory =
  | "auth"
  | "navigation_search"
  | "chat_list"
  | "conversation_header"
  | "messages"
  | "date_headers"
  | "links";

export interface LocatorDefinition {
  id: string;
  name: string;
  category: ElementCategory;
  description: string;
  primary: string;
  fallbacks: string[];
  isOptional?: boolean;
  requiresParent?: string;
}

export const WHATSAPP_LOCATORS: Record<string, LocatorDefinition> = {
  // ---------------------------------------------------------------------------
  // AUTHENTICATION & LOGIN SCREEN
  // ---------------------------------------------------------------------------
  qrCanvas: {
    id: "qrCanvas",
    name: "Login QR Code Canvas",
    category: "auth",
    description: "The QR code canvas rendered on the WhatsApp Web login screen for device linking.",
    primary: 'canvas[aria-label*="Scan"]',
    fallbacks: [
      "canvas",
      'div[data-ref] canvas',
      '[data-testid="qrcode"]',
    ],
  },
  loginInstructions: {
    id: "loginInstructions",
    name: "Login Instruction Header / Card",
    category: "auth",
    description: "Header or instruction card guiding the user to scan the QR code.",
    primary: 'div:text-is("Scan to log in")',
    fallbacks: [
      'h1:has-text("Scan to log in")',
      'h2:has-text("Scan to log in")',
      'span:text-is("Scan to log in")',
      "h1",
      "h2",
      'div[data-ref] ~ div',
      '[data-testid="intro-title"]',
      "div._ak96",
    ],
  },
  loginContainer: {
    id: "loginContainer",
    name: "Login Wrapper / Card Container",
    category: "auth",
    description: "Main container housing the authentication QR code and instructions.",
    primary: 'div[data-testid="link-device-qr-code"]',
    fallbacks: [
      "div[data-ref]",
      'div[data-testid="qrcode"]',
      "div._ak96",
      "div.landing-wrapper",
      "canvas",
    ],
  },

  // ---------------------------------------------------------------------------
  // SEARCH & NAVIGATION CONTROLS
  // ---------------------------------------------------------------------------
  chatListSearchInput: {
    id: "chatListSearchInput",
    name: "Chat List Search Input Box",
    category: "navigation_search",
    description: "Search text input in left navigation pane used to filter contacts and groups.",
    primary: '#side div[data-testid="chat-list-search-container"] input',
    fallbacks: [
      '#side input[role="textbox"]',
      '#side input[placeholder*="Search"]',
      '#side div[data-testid="chat-list-search-container"] [contenteditable="true"]',
      '#side [data-tab="3"]',
      '#side [data-testid="chat-list-search"]',
      '#side [role="textbox"]',
    ],
    requiresParent: "#side",
  },
  chatListSearchClearBtn: {
    id: "chatListSearchClearBtn",
    name: "Clear Search Button",
    category: "navigation_search",
    description: "Cancel / clear icon button inside search input container to reset search query.",
    primary: '#side [data-testid="chat-list-search-container"] button',
    fallbacks: [
      '#side button[aria-label="Cancel search"]',
      '#side button[aria-label="End icon button"]',
      '#side [data-testid="search-cancel-btn"]',
    ],
    isOptional: true,
    requiresParent: "#side",
  },

  // ---------------------------------------------------------------------------
  // CHAT LIST & ROWS
  // ---------------------------------------------------------------------------
  chatListContainer: {
    id: "chatListContainer",
    name: "Chat List Virtual Scroll Container",
    category: "chat_list",
    description: "Left pane container housing the virtualized chat list items.",
    primary: "#pane-side",
    fallbacks: [
      '[data-testid="chat-list"]',
      '#side [aria-label*="Chat list"]',
      '#side [aria-label*="Chats"]',
      "#side",
    ],
  },
  chatListRow: {
    id: "chatListRow",
    name: "Chat List Row Item",
    category: "chat_list",
    description: "Individual chat row element representing a conversation or group.",
    primary: '#pane-side [role="row"]',
    fallbacks: [
      '[data-testid="chat-list"] [role="row"]',
      '[aria-label="Search results."] [role="row"]',
      '[data-testid^="list-item-"]',
    ],
    requiresParent: "#pane-side",
  },
  chatRowTitle: {
    id: "chatRowTitle",
    name: "Chat Row Title Span",
    category: "chat_list",
    description: "Title text element inside a chat row showing contact/group name.",
    primary: '[data-testid="cell-frame-title"] span',
    fallbacks: [
      "span[title]",
      '[data-testid="cell-frame-title"]',
      'div[role="gridcell"] span[title]',
    ],
  },
  chatRowUnreadBadge: {
    id: "chatRowUnreadBadge",
    name: "Unread Message Count Badge",
    category: "chat_list",
    description: "Badge displaying unread message count in a chat list row.",
    primary: '[data-testid="icon-unread-count"]',
    fallbacks: [
      'span[aria-label*="unread message" i]',
      'span[aria-label*="unread" i]',
      'span[aria-label*="Unread"]',
      '[data-testid="cell-frame-secondary"] [aria-label*="unread" i]',
      'span[role="status"]',
    ],
    isOptional: true,
  },

  // ---------------------------------------------------------------------------
  // ACTIVE CONVERSATION HEADER
  // ---------------------------------------------------------------------------
  conversationHeader: {
    id: "conversationHeader",
    name: "Active Conversation Header Container",
    category: "conversation_header",
    description: "Top header of the right conversation pane showing the active chat details.",
    primary: "#main header",
    fallbacks: [
      '#main [data-testid="conversation-header"]',
      "#main",
    ],
    requiresParent: "#main",
  },
  conversationChatTitle: {
    id: "conversationChatTitle",
    name: "Active Conversation Chat Title",
    category: "conversation_header",
    description: "Title element inside conversation header displaying group or contact name.",
    primary: '#main [data-testid="conversation-info-header-chat-title"]',
    fallbacks: [
      '#main [data-testid="conversation-header"] h2',
      "#main header span[title]",
      "#main header h2",
    ],
    requiresParent: "#main",
  },

  // ---------------------------------------------------------------------------
  // MESSAGE HISTORY & CONTENT
  // ---------------------------------------------------------------------------
  conversationPanelMessages: {
    id: "conversationPanelMessages",
    name: "Conversation Messages Scroll Panel",
    category: "messages",
    description: "Scrollable conversation message container inside #main.",
    primary: '#main [data-testid="conversation-panel-messages"]',
    fallbacks: [
      '#main [data-testid="conversation-panel-body"] [tabindex="0"]',
      '#main .copyable-area [tabindex="0"]',
      "#main .copyable-area",
      '#main div[tabindex="0"]',
    ],
    requiresParent: "#main",
  },
  messageContainer: {
    id: "messageContainer",
    name: "Message Bubble Container",
    category: "messages",
    description: "Outer container for an individual message bubble.",
    primary: '#main div[data-testid^="conv-msg-"]',
    fallbacks: [
      '#main div[data-testid="msg-container"]',
      "#main div.copyable-text",
      '#main div[role="row"]',
    ],
    requiresParent: "#main",
  },
  copyableText: {
    id: "copyableText",
    name: "Copyable Message Text Span",
    category: "messages",
    description: "Text element holding data-pre-plain-text (timestamp + sender) and message body.",
    primary: "#main div.copyable-text",
    fallbacks: [
      "#main [data-pre-plain-text]",
      '#main [data-testid="selectable-text"]',
      "span.selectable-text",
    ],
    requiresParent: "#main",
  },

  // ---------------------------------------------------------------------------
  // DATE DIVIDERS
  // ---------------------------------------------------------------------------
  dateDividerSpan: {
    id: "dateDividerSpan",
    name: "Conversation Date Divider Span",
    category: "date_headers",
    description: "Header span separating messages by date (e.g. TODAY, YESTERDAY, DATE).",
    primary: "#main div[tabindex='-1'] span[dir='auto']",
    fallbacks: [
      "#main span[dir='auto']",
      '#main [data-testid="conversation-panel-messages"] span',
    ],
    isOptional: true,
    requiresParent: "#main",
  },

  // ---------------------------------------------------------------------------
  // EMBEDDED LINKS
  // ---------------------------------------------------------------------------
  messageAnchorLink: {
    id: "messageAnchorLink",
    name: "Message Hyperlink Anchor",
    category: "links",
    description: "Anchor tag (a[href]) embedded inside conversation messages.",
    primary: '#main [data-testid^="conv-msg-"] a[href], #main [data-testid="msg-container"] a[href]',
    fallbacks: [
      '#main a[href^="http"]',
      "#main div.copyable-text a[href]",
      "#main a[href]",
    ],
    isOptional: true,
    requiresParent: "#main",
  },
};
