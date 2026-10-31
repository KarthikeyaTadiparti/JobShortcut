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
  | "links"
  | "channels";

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

export type LocatorKey =
  | "loadingProgressBar"
  | "introTitle"
  | "qrCanvas"
  | "loginInstructions"
  | "loginContainer"
  | "chatListSearchInput"
  | "chatListSearchClearBtn"
  | "chatsTabBtn"
  | "chatListContainer"
  | "chatListRow"
  | "chatRowTitle"
  | "chatRowUnreadBadge"
  | "conversationHeader"
  | "conversationChatTitle"
  | "conversationPanelMessages"
  | "messageContainer"
  | "copyableText"
  | "dateDividerSpan"
  | "messageAnchorLink"
  | "messageRow"
  | "virtualizedPlaceholder"
  | "quotedMessage"
  | "readMoreBtn"
  | "unreadDivider"
  | "historyLoadingSpinner"
  | "scrollToBottomBtn"
  | "channelsTabBtn"
  | "channelsListContainer"
  | "channelsSearchInput"
  | "channelListRow"
  | "channelRowTitle"
  | "channelRowUnreadBadge"
  | "channelHeader"
  | "channelChatTitle"
  | "channelMessageContainer"
  | "channelCopyableText"
  | "channelMessageLink";

export const WHATSAPP_LOCATORS: Record<LocatorKey, LocatorDefinition> = {
  // ---------------------------------------------------------------------------
  // AUTHENTICATION & LOGIN SCREEN
  // ---------------------------------------------------------------------------
  loadingProgressBar: {
    id: "loadingProgressBar",
    name: "Loading Progress Bar / Spinner",
    category: "auth",
    description: "Initial loading bar or splash screen overlay indicating WhatsApp Web is synchronizing.",
    primary: 'progress, [role="progressbar"], div[aria-label*="Loading" i]',
    fallbacks: [
      '[role="progressbar"]',
      'div[data-testid="initial-loading"]',
      'progress',
      'div[aria-label*="Loading" i]',
    ],
    isOptional: true,
  },
  introTitle: {
    id: "introTitle",
    name: "Intro Splash Title",
    category: "auth",
    description: "WhatsApp Web splash / intro title on the default landing state.",
    primary: '[data-testid="intro-title"], h1',
    fallbacks: [
      "h1",
      "h2",
      '[data-testid="intro-text"]',
    ],
    isOptional: true,
  },
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
    primary: 'div[data-testid="chat-list-search-container"] input[aria-label="Search or start a new chat"], #side div[data-testid="chat-list-search-container"] input[aria-label="Search or start a new chat"]',
    fallbacks: [
      'div[data-testid="chat-list-search-container"] input',
      'input[aria-label="Search or start a new chat"]',
      'input[placeholder="Search or start a new chat"]',
      'div[data-testid="chat-list-search-container"] input[role="textbox"]',
      'div[data-testid="chat-list-search-container"] input[data-tab="3"]',
      '#side input[role="textbox"]',
      '#side input[placeholder*="Search" i]',
      'input[aria-label*="Search" i]',
      '#side [data-tab="3"]',
      '#side div[data-testid="chat-list-search-container"] [contenteditable="true"]',
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
      '#side [data-testid="search-cancel"]',
      'button[aria-label="Cancel search"]',
      'span[data-icon="x"]',
      'span[data-icon="x-alt"]',
    ],
    isOptional: true,
    requiresParent: "#side",
  },
  chatsTabBtn: {
    id: "chatsTabBtn",
    name: "Chats Navigation Rail Button",
    category: "navigation_search",
    description: "Sidebar rail button to navigate to the Chats view.",
    primary: 'button[aria-label="Chats"], button[aria-label="Chats "], [data-testid="menu-bar-chats"]',
    fallbacks: [
      'span[data-icon="chats"]',
      'span[data-icon="chat"]',
      'button[aria-label*="Chat" i]',
      'div[role="navigation"] button:has([data-icon="chats"])',
      'div[role="navigation"] button:has([data-icon="chat"])',
    ],
  },

  // ---------------------------------------------------------------------------
  // CHAT LIST & ROWS
  // ---------------------------------------------------------------------------
  chatListContainer: {
    id: "chatListContainer",
    name: "Chat List Virtual Scroll Container",
    category: "chat_list",
    description: "Left pane container housing the virtualized chat list items.",
    primary: '#pane-side, div[data-testid="chat-list"], div[aria-label="Chat list"]',
    fallbacks: [
      '#pane-side',
      'div[data-testid="chat-list"]',
      'div[aria-label="Chat list"]',
      'div[data-scrolltracepolicy="wa.web.chatlist"]',
      '#side [aria-label*="Chat list" i]',
      '#side [aria-label*="Chats" i]',
      "#side",
    ],
  },
  chatListRow: {
    id: "chatListRow",
    name: "Chat List Row Item",
    category: "chat_list",
    description: "Individual chat row element representing a conversation or group.",
    primary:
      '#pane-side [role="row"], div[data-testid^="list-item-"][role="row"], div[data-testid="cell-frame-container"], [data-testid="chat-list"] [role="row"]',
    fallbacks: [
      'div[data-testid^="list-item-"]',
      'div[role="row"]',
      '[data-testid="chat-list"] [role="row"]',
      '[aria-label="Chat list"] [role="row"]',
      '[aria-label="Search results."] [role="row"]',
      'div[data-testid="message-yourself-row"]',
    ],
    requiresParent: "#pane-side",
  },
  chatRowTitle: {
    id: "chatRowTitle",
    name: "Chat Row Title Span",
    category: "chat_list",
    description: "Title text element inside a chat row showing contact/group name.",
    primary:
      '[data-testid="cell-frame-title"] span[title], [data-testid="cell-frame-title"] span[dir="auto"], [data-testid="cell-frame-title"] span, span[title], span[dir="auto"]',
    fallbacks: [
      "span[title]",
      'span[dir="auto"]',
      '[data-testid="cell-frame-title"]',
      'div[role="gridcell"] span[title]',
      'div[role="gridcell"] span',
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
      '[data-testid="cell-frame-title"] span[class*="unread" i]',
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
      '#main header[data-testid="conversation-header"]',
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
    primary: '#main [data-testid="conversation-panel-messages"], [data-testid="conversation-panel-messages"]',
    fallbacks: [
      '#main [data-testid="conversation-panel-body"] [tabindex="0"]',
      '#main div[data-scrolltracepolicy="wa.web.conversation.messages"]',
      '#main .copyable-area [tabindex="0"]',
      "#main .copyable-area",
      '#main div[tabindex="0"]',
      '[data-testid="conversation-panel-messages"]',
    ],
    requiresParent: "#main",
  },
  messageContainer: {
    id: "messageContainer",
    name: "Message Bubble Container",
    category: "messages",
    description: "Outer container for an individual message bubble.",
    primary: '#main div[data-testid^="conv-msg-"], div[data-testid^="conv-msg-"]',
    fallbacks: [
      '#main div[data-testid="msg-container"]',
      'div[data-testid="msg-container"]',
      '#main div.focusable-list-item',
      "#main div.copyable-text",
      '#main div[role="row"]',
      'div[role="row"]',
    ],
    requiresParent: "#main",
  },
  copyableText: {
    id: "copyableText",
    name: "Copyable Message Text Span",
    category: "messages",
    description: "Text element holding data-pre-plain-text (timestamp + sender) and message body.",
    primary: "#main div.copyable-text, div.copyable-text",
    fallbacks: [
      "#main [data-pre-plain-text]",
      "[data-pre-plain-text]",
      '#main [data-testid="selectable-text"]',
      '[data-testid="selectable-text"]',
      '#main [data-testid*="selectable-text"]',
      '[data-testid*="selectable-text"]',
      "span.selectable-text",
      "#main span.selectable-text",
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
    primary: "#main div[tabindex='-1'] span[dir='auto'], div[tabindex='-1'] span[dir='auto']",
    fallbacks: [
      "#main [data-testid='conversation-panel-messages'] div[tabindex='-1'] span[dir='auto']",
      "#main span[dir='auto']",
      '#main [data-testid="conversation-panel-messages"] span',
      "div[tabindex='-1'] span[dir='auto']",
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
    primary: '#main [data-testid^="conv-msg-"] a[href], #main [data-testid="msg-container"] a[href], [data-testid="msg-container"] a[href]',
    fallbacks: [
      '#main a[href^="http"]',
      '#main [data-testid="selectable-text"] a[href]',
      "#main div.copyable-text a[href]",
      "#main a[href]",
      'a[href^="http"]',
    ],
    isOptional: true,
    requiresParent: "#main",
  },

  // ---------------------------------------------------------------------------
  // VIRTUALIZED HISTORY HARVESTING
  // ---------------------------------------------------------------------------
  messageRow: {
    id: "messageRow",
    name: "Message Row With Stable Id",
    category: "messages",
    description: "Outermost element of a message carrying the stable data-id used as the merge key.",
    primary: "#main [data-id]",
    fallbacks: [
      '#main div[role="row"] [data-id]',
      '#main div[data-testid^="conv-msg-"]',
      '#main div[data-testid="msg-container"]',
      "#main .message-in",
      "#main .message-out",
    ],
    requiresParent: "#main",
  },
  virtualizedPlaceholder: {
    id: "virtualizedPlaceholder",
    name: "Virtualized Message Placeholder",
    category: "messages",
    description: "Empty fixed-height shell WhatsApp renders inside an off-screen message row instead of its content.",
    primary: '[data-virtualized="true"]',
    fallbacks: [],
    isOptional: true,
    requiresParent: "#main",
  },
  quotedMessage: {
    id: "quotedMessage",
    name: "Quoted Reply Preview",
    category: "messages",
    description: "Quoted message preview inside a reply bubble; its text and links belong to another message.",
    primary: '[data-testid="quoted-message"]',
    fallbacks: [
      '[aria-label*="Quoted message" i]',
      '[aria-label*="quoted" i]',
      ".quoted-mention",
    ],
    isOptional: true,
    requiresParent: "#main",
  },
  readMoreBtn: {
    id: "readMoreBtn",
    name: "Read More Expander",
    category: "messages",
    description: "Inline button that expands a truncated long message body.",
    primary: '#main [role="button"]',
    fallbacks: [
      "#main button",
      "#main span[role='button']",
      "#main div[role='button']",
    ],
    isOptional: true,
    requiresParent: "#main",
  },
  unreadDivider: {
    id: "unreadDivider",
    name: "Unread Messages Divider",
    category: "messages",
    description: "In-chat divider reading 'N unread messages' placed above the first unread message.",
    primary: '#main [aria-live] span',
    fallbacks: [
      "#main div[role='row'] span",
      "#main span",
    ],
    isOptional: true,
    requiresParent: "#main",
  },
  historyLoadingSpinner: {
    id: "historyLoadingSpinner",
    name: "Older History Loading Spinner",
    category: "messages",
    description: "Spinner shown at the top of the conversation while older messages are fetched.",
    primary: '#main [role="progressbar"]',
    fallbacks: [
      "#main progress",
      '#main [data-testid*="spinner" i]',
      '#main [data-icon*="spinner" i]',
      "#main svg circle[class*='spin' i]",
    ],
    isOptional: true,
    requiresParent: "#main",
  },
  scrollToBottomBtn: {
    id: "scrollToBottomBtn",
    name: "Scroll To Bottom Button",
    category: "messages",
    description: "Floating button that jumps the conversation to the newest message.",
    primary: '#main [aria-label="Scroll to bottom"]',
    fallbacks: [
      '#main [data-testid="scroll-to-bottom"]',
      '#main span[data-icon="down"]',
      '#main span[data-icon*="chevron-down" i]',
    ],
    isOptional: true,
    requiresParent: "#main",
  },

  // ---------------------------------------------------------------------------
  // WHATSAPP CHANNELS NAVIGATION & BROADCAST FEED
  // ---------------------------------------------------------------------------
  channelsTabBtn: {
    id: "channelsTabBtn",
    name: "Channels / Updates Navigation Rail Button",
    category: "channels",
    description: "Sidebar rail button to navigate to the Channels / Updates view.",
    primary: 'button[aria-label="Channels"], button[aria-label="Channels "], button[aria-label="Updates"], button[aria-label="Updates "], [data-testid="menu-bar-chats-channels"]',
    fallbacks: [
      'button[aria-label*="Channel" i]',
      'button[aria-label*="Newsletter" i]',
      'button[aria-label*="Update" i]',
      'span[data-icon="newsletter"]',
      'span[data-icon="newsletter-outline"]',
      'span[data-icon="newsletter-filled"]',
      'span[data-icon="channel"]',
      'span[data-icon="channel-outline"]',
      'span[data-icon="channel-filled"]',
      'span[data-icon="updates"]',
      'div[role="navigation"] button:has([data-icon*="newsletter"])',
      'div[role="navigation"] button:has([data-icon*="channel"])',
      'div[role="navigation"] button:has([data-icon*="update"])',
    ],
  },
  channelsListContainer: {
    id: "channelsListContainer",
    name: "Channels List Container",
    category: "channels",
    description: "Left sidebar pane housing followed channels and updates.",
    primary:
      'div[data-testid="newsletter-tab-channel-list"], div[aria-label="Channel list"], div[data-testid="channel-list"], div[aria-label="Channels"]',
    fallbacks: [
      '#side [data-testid="newsletter-tab-channel-list"]',
      '#side [aria-label*="Channel list" i]',
      '#side [aria-label*="Channels" i]',
      '#side [data-testid="newsletter-tab"]',
      'div[data-testid="newsletter-tab"]',
      'div[role="navigation"][aria-label*="Channel list" i]',
      'div[role="region"][aria-label*="Channel" i]',
    ],
  },
  channelsSearchInput: {
    id: "channelsSearchInput",
    name: "Channels Filter / Search Input",
    category: "channels",
    description: "Search/filter input box at top of Channels list view.",
    primary:
      'div[data-testid="chat-list-search-container"] input[aria-label="Search"], #side div[data-testid="chat-list-search-container"] input[aria-label="Search"]',
    fallbacks: [
      'div[data-testid="chat-list-search-container"] input',
      'input[aria-label="Search"]',
      'input[placeholder="Search"]',
      'div[data-testid="chat-list-search-container"] input[role="textbox"]',
      'div[data-testid="chat-list-search-container"] input[data-tab="3"]',
      '#side input[aria-label="Search"]',
      '#side input[placeholder="Search"]',
      '#side input[role="textbox"]',
      'input[aria-label*="Search" i]',
      'input[placeholder*="Search" i]',
      '#side [data-tab="3"]',
      '#side div[role="search"] input',
      '#side div[data-testid="chat-list-search-container"] [contenteditable="true"]',
      'div[role="textbox"]',
    ],
    isOptional: true,
  },
  channelListRow: {
    id: "channelListRow",
    name: "Channel Item Row",
    category: "channels",
    description: "Individual channel item in the followed channels list.",
    primary:
      'div[data-testid="newsletter-tab-newsletter-cell"], [aria-label="Channel list"] [role="listitem"], div[role="listitem"][data-testid^="list-item-"], [aria-label="Channel list"] [role="button"]',
    fallbacks: [
      'div[aria-label$="Channel"][role="button"]',
      'div[aria-label*="Channel" i][role="button"]',
      'div[data-testid="cell-frame-container"]',
      'div[role="listitem"]',
      '#side [role="row"]',
    ],
  },
  channelRowTitle: {
    id: "channelRowTitle",
    name: "Channel Row Title",
    category: "channels",
    description: "Title text element inside a channel row.",
    primary:
      '[data-testid="cell-frame-title"] span[dir="auto"], [data-testid="cell-frame-title"] span[title], [data-testid="cell-frame-title"] span, span[title], span[dir="auto"]',
    fallbacks: [
      '[data-testid="cell-frame-title"]',
      'div[role="gridcell"] span',
      'div[role="gridcell"]',
      'span',
    ],
  },
  channelRowUnreadBadge: {
    id: "channelRowUnreadBadge",
    name: "Channel Unread Count Badge",
    category: "channels",
    description: "Green unread message count badge on channel item.",
    primary: '[data-testid="icon-unread-count"]',
    fallbacks: [
      'span[aria-label*="unread message" i]',
      'span[aria-label*="unread" i]',
      'span[aria-label*="Unread"]',
      'div[aria-label*="unread message" i]',
      'div[aria-label*="unread" i]',
      '[data-testid="unread-count"]',
      '[data-testid="cell-frame-title"] span[class*="unread" i]',
      '[data-testid="cell-frame-secondary"] [aria-label*="unread" i]',
      'span[role="status"]',
    ],
    isOptional: true,
  },
  channelHeader: {
    id: "channelHeader",
    name: "Channel Feed Header",
    category: "channels",
    description: "Top header of the active channel feed showing channel details.",
    primary: '#main header, div[data-testid="conversation-header"]',
    fallbacks: [
      '#main [data-testid="conversation-header"]',
      '#main header[data-testid="conversation-header"]',
    ],
  },
  channelChatTitle: {
    id: "channelChatTitle",
    name: "Active Channel Title",
    category: "channels",
    description: "Title text element inside the channel header.",
    primary: '#main [data-testid="conversation-info-header-chat-title"], #main header span[title]',
    fallbacks: [
      '#main [data-testid="conversation-header"] h2',
      "#main header span[title]",
      "#main header h2",
      "#main header span[dir='auto']",
      "#main header span",
    ],
  },
  channelMessageContainer: {
    id: "channelMessageContainer",
    name: "Channel Broadcast Message Bubble",
    category: "channels",
    description: "Container housing a broadcast message post inside the channel feed.",
    primary: '#main div[data-testid^="conv-msg-"], div[data-testid^="conv-msg-"]',
    fallbacks: [
      '#main div[data-testid="msg-container"]',
      'div[data-testid="msg-container"]',
      '#main div.focusable-list-item',
      "#main div.copyable-text",
      '#main div[role="row"]',
      '#main .message-in',
      'div[role="row"]',
    ],
    requiresParent: "#main",
  },
  channelCopyableText: {
    id: "channelCopyableText",
    name: "Channel Message Text Content",
    category: "channels",
    description: "Text element holding post body text.",
    primary: "#main div.copyable-text, div.copyable-text",
    fallbacks: [
      "#main [data-pre-plain-text]",
      "[data-pre-plain-text]",
      '#main [data-testid="selectable-text"]',
      '[data-testid="selectable-text"]',
      '#main [data-testid*="selectable-text"]',
      '[data-testid*="selectable-text"]',
      "span.selectable-text",
      "#main span.selectable-text",
      '#main div[dir="ltr"]',
    ],
    requiresParent: "#main",
  },
  channelMessageLink: {
    id: "channelMessageLink",
    name: "Channel Message Hyperlink Anchor",
    category: "channels",
    description: "Anchor tag (a[href]) embedded inside channel broadcast posts.",
    primary: '#main [data-testid^="conv-msg-"] a[href], #main [data-testid="msg-container"] a[href], [data-testid="msg-container"] a[href]',
    fallbacks: [
      '#main a[href^="http"]',
      '#main [data-testid="selectable-text"] a[href]',
      "#main div.copyable-text a[href]",
      "#main a[href]",
      'a[href^="http"]',
    ],
    isOptional: true,
    requiresParent: "#main",
  },
};

/**
 * Returns an array containing the primary selector followed by all fallback selectors for a given locator definition.
 */
export function getLocatorSelectors(def: LocatorDefinition): string[] {
  return [def.primary, ...def.fallbacks];
}

/**
 * Resolves all selectors (primary + fallbacks) for a locator definition into a single comma-separated selector string.
 */
export function getCombinedSelector(def: LocatorDefinition): string {
  return [def.primary, ...def.fallbacks].join(', ');
}

