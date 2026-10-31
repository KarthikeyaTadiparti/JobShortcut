/**
 * Builds an offline, WhatsApp-like conversation page whose message list is virtualized.
 * Two modes:
 * - "unmount": only rows inside the viewport (plus overscan) exist in the DOM.
 * - "placeholder": every row and divider stays mounted with its data-id (as live
 *   WhatsApp Web does), but off-screen message rows are empty
 *   `data-virtualized="true"` shells with no text, timestamp, or links.
 */

export type VirtualizationMode = "unmount" | "placeholder";

export interface FixtureDay {
    /** Divider label rendered above the day (e.g. "TODAY", "TUESDAY", "25/09/2026"). */
    label: string;
    /** Date part used in data-pre-plain-text, d/m/yyyy (e.g. "1/10/2026"). */
    preDate: string;
    /** Id prefix for messages of this day (e.g. "T" -> T001, T002...). */
    prefix: string;
    count: number;
}

export interface FixtureMessage {
    id: string;
    /** Every link the message holds, including ones only shown after "Read more". */
    links: string[];
}

export interface VirtualizedChatFixture {
    html: string;
    /** Message ids per day prefix, oldest -> newest. */
    idsByPrefix: Record<string, string[]>;
    messages: FixtureMessage[];
}

export interface FixtureOptions {
    days: FixtureDay[];
    /** Number of trailing messages placed below the "N unread messages" divider. */
    unreadCount: number;
    mode?: VirtualizationMode;
    rowHeight?: number;
    viewportHeight?: number;
}

/**
 * Generates the fixture page. Every 7th message is truncated behind "Read more" and
 * its link only appears in the expanded body; every 5th message has a visible link.
 */
export function buildVirtualizedChat(options: FixtureOptions): VirtualizedChatFixture {
    const rowHeight = options.rowHeight ?? 60;
    const viewportHeight = options.viewportHeight ?? 600;
    const mode: VirtualizationMode = options.mode ?? "unmount";

    type Row =
        | { type: "divider"; label: string }
        | { type: "unread"; label: string }
        | { type: "message"; id: string; pre: string; text: string; fullText: string; truncated: boolean };

    const rows: Row[] = [];
    const messages: FixtureMessage[] = [];
    const idsByPrefix: Record<string, string[]> = {};

    for (const day of options.days) {
        rows.push({ type: "divider", label: day.label });
        idsByPrefix[day.prefix] = [];
        for (let n = 1; n <= day.count; n++) {
            const id = `${day.prefix}${String(n).padStart(3, "0")}`;
            const hour = 8 + Math.floor((n * 7) / 60);
            const minute = String((n * 7) % 60).padStart(2, "0");
            const pre = `[${hour}:${minute} am, ${day.preDate}] Sender ${n % 3}: `;
            const truncated = n % 7 === 0;
            const visibleLink = n % 5 === 0 ? ` https://jobs.example.com/${id}` : "";
            const hiddenLink = truncated ? ` https://jobs.example.com/hidden/${id}` : "";
            const text = `Job post ${id}${visibleLink}`;
            const fullText = truncated ? `${text} full description${hiddenLink}` : text;
            rows.push({ type: "message", id, pre, text, fullText, truncated });
            idsByPrefix[day.prefix]!.push(id);
            const links = [visibleLink, hiddenLink].map((l) => l.trim()).filter(Boolean);
            messages.push({ id, links });
        }
    }

    if (options.unreadCount > 0) {
        const insertAt = rows.length - options.unreadCount;
        const label = `${options.unreadCount} unread message${options.unreadCount === 1 ? "" : "s"}`;
        rows.splice(insertAt, 0, { type: "unread", label });
    }

    const unreadIndex = rows.findIndex((r) => r.type === "unread");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; font-family: sans-serif; }
  #main { display: flex; flex-direction: column; height: ${viewportHeight + 60}px; }
  #main header { height: 60px; }
  #scroller { height: ${viewportHeight}px; overflow-y: auto; position: relative; }
  .pill { position: sticky; top: 0; z-index: 2; background: #eee; text-align: center; }
  .row { height: ${rowHeight}px; overflow: hidden; box-sizing: border-box; border-bottom: 1px solid #ddd; }
</style>
</head>
<body>
<div id="main">
  <header><span data-testid="conversation-info-header-chat-title" title="Fixture Group">Fixture Group</span></header>
  <div id="scroller" data-testid="conversation-panel-messages">
    <div class="pill"><div tabindex="-1"><span dir="auto">TODAY</span></div></div>
    <div id="topPad"></div>
    <div id="rows" role="application"></div>
    <div id="botPad"></div>
  </div>
</div>
<script>
  const ROWS = ${JSON.stringify(rows)};
  const H = ${rowHeight};
  const OVERSCAN = 2;
  const MODE = ${JSON.stringify(mode)};
  const expanded = new Set();
  const sc = document.getElementById("scroller");
  const rowsEl = document.getElementById("rows");
  const topPad = document.getElementById("topPad");
  const botPad = document.getElementById("botPad");

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const linkify = (s) => esc(s).replace(/(https?:\\/\\/[^\\s]+)/g, '<a href="$1">$1</a>');

  function shellHtml(r) {
    return '<div class="row" role="row"><div data-id="false_fixture@g.us_' + r.id + '">' +
      '<div data-virtualized="true" style="min-height: ' + H + 'px;"><div></div></div></div></div>';
  }

  function rowHtml(r, idx) {
    if (r.type === "divider") {
      return '<div class="row" role="row"><div tabindex="-1"><span dir="auto">' + esc(r.label) + '</span></div></div>';
    }
    if (r.type === "unread") {
      return '<div class="row" role="row"><div aria-live="polite"><span>' + esc(r.label) + '</span></div></div>';
    }
    const isOpen = !r.truncated || expanded.has(r.id);
    const body = isOpen ? r.fullText : r.text;
    const more = isOpen ? "" : '<span role="button" class="read-more" data-idx="' + idx + '">Read more</span>';
    return '<div class="row" role="row"><div data-id="false_fixture@g.us_' + r.id + '">' +
      '<div class="message-in"><div class="copyable-text" data-pre-plain-text="' + esc(r.pre) + '">' +
      '<span class="selectable-text copyable-text" dir="ltr"><span>' + linkify(body) + '</span></span></div>' +
      more + '</div></div></div>';
  }

  function render() {
    const st = sc.scrollTop;
    const ch = sc.clientHeight;
    const first = Math.max(0, Math.floor(st / H) - OVERSCAN);
    const last = Math.min(ROWS.length, Math.ceil((st + ch) / H) + OVERSCAN);
    if (MODE === "placeholder") {
      let all = "";
      for (let i = 0; i < ROWS.length; i++) {
        const r = ROWS[i];
        all += (r.type === "message" && (i < first || i >= last)) ? shellHtml(r) : rowHtml(r, i);
      }
      rowsEl.innerHTML = all;
      return;
    }
    topPad.style.height = (first * H) + "px";
    botPad.style.height = ((ROWS.length - last) * H) + "px";
    let out = "";
    for (let i = first; i < last; i++) out += rowHtml(ROWS[i], i);
    rowsEl.innerHTML = out;
  }

  rowsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".read-more");
    if (!btn) return;
    expanded.add(ROWS[Number(btn.dataset.idx)].id);
    render();
  });

  sc.addEventListener("scroll", render);
  render();
  // WhatsApp opens unread chats at the unread divider, not at the bottom.
  sc.scrollTop = ${unreadIndex >= 0 ? unreadIndex : rows.length} * H;
  render();
</script>
</body>
</html>`;

    return { html, idsByPrefix, messages };
}
