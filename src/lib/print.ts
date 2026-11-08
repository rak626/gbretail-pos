import type { ReceiptItem } from "@/types";
import { generateReceiptHtml } from "./receipt/template";
import type { ReceiptMeta, ReceiptShop } from "./receipt/types";

export type { ReceiptMeta, ReceiptPayment, ReceiptShop } from "./receipt/types";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getOrderPdfFilename(orderId: string, date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const ts = `${yy}${mm}${dd}${hh}${mi}${ss}`;
  const safeId = orderId.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${safeId}_${ts}`;
}

// Centralized print — same-window iframe first (popup-blocker safe), window.open fallback.
// Returns true when the print dialog was opened, false when blocked.
export function printReceiptHTML(html: string): boolean {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        // Let the iframe render before printing
        setTimeout(() => {
          try {
            win.print();
          } finally {
            setTimeout(() => iframe.remove(), 1000);
          }
        }, 250);
        return true;
      }
      iframe.remove();
    }
  } catch {
    // fall through to window.open fallback
  }
  const w = window.open("", "_blank");
  if (!w) {
    // Popup blocked and iframe failed — caller should toast guidance.
    return false;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}

/**
 * Builds the printable receipt HTML.
 *
 * Kept as a positional wrapper for existing call sites; new code can pass a
 * {@link ReceiptMeta} object to print bill number/date, cashier, counter and
 * tender rows. When `meta.billNo` is missing the receipt is marked as a draft.
 */
export function generateReceiptHTML(
  items: ReceiptItem[],
  total: number,
  discount: number,
  customerName?: string,
  orderId?: string,
  shop?: ReceiptShop | null,
  meta?: ReceiptMeta | null,
): string {
  const merged: ReceiptMeta = {
    ...(meta ?? {}),
    billNo: meta?.billNo ?? orderId ?? null,
    customerName: meta?.customerName ?? customerName ?? null,
  };
  return generateReceiptHtml({ items, total, discount, shop, meta: merged });
}
