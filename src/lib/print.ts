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

type ReceiptItem = {
  name: string;
  unit?: string;
  lineTotal: number;
  qty?: string;
  rate?: string;
  price?: number;
  perUnit?: string;
  quantity?: number | null;
  weight?: number | null;
  isCustom?: boolean;
};

function getPerUnitLabel(p: ReceiptItem): string {
  // fallback to unit string if rate/perUnit not provided
  if (p.rate) return p.rate;
  if (p.perUnit) return `${formatINR(p.price ?? 0)} / ${p.perUnit}`;
  if (p.price != null) {
    const u = (p.perUnit || p.unit || "pc").toLowerCase();
    if (u === "pcs" || u === "pc" || u === "pcs.") return `${formatINR(p.price)} / pc`;
    if (u === "pack" || u === "pkt" || u === "packet") return `${formatINR(p.price)} / pack`;
    if (u === "kg" || u === "g" || p.weight) return `${formatINR(p.price)}/kg`;
    return `${formatINR(p.price)} / ${u || "pc"}`;
  }
  return "";
}

function getQtyText(p: ReceiptItem): string {
  if (p.qty) return p.qty;
  if (p.weight != null && p.weight > 0) {
    if (p.weight >= 1) return `${Number(p.weight).toFixed(3)} kg`.replace(/\.000/, "");
    return `${Math.round(Number(p.weight) * 1000)} g`;
  }
  const q = p.quantity ?? (p.unit ? parseFloat(String(p.unit)) : NaN);
  if (!isNaN(q as number)) return String(q);
  if (p.unit && p.unit.trim() && !p.unit.includes("₹")) return String(p.unit).trim();
  return "1";
}

export function generateReceiptHTML(
  items: ReceiptItem[],
  total: number,
  discount: number,
  customerName?: string,
  orderId?: string
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN");
  const timeStr = now.toLocaleTimeString("en-IN");
  const pdfTitle = orderId ? getOrderPdfFilename(orderId, now) : `ORDER_${getOrderPdfFilename("TEMP", now)}`;

  const headerRow = `
    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #000;font-weight:bold;font-size:8px;padding:3px 0;margin-bottom:3px;letter-spacing:0.2px;">
      <span style="width:8%;text-align:left;">#</span>
      <span style="width:42%;text-align:left;">Product</span>
      <span style="width:15%;text-align:center;">Qty</span>
      <span style="width:17%;text-align:right;">Rate</span>
      <span style="width:18%;text-align:right;">Amt</span>
    </div>`;

  const itemsHTML = items
    .map((item, i) => {
      const qty = getQtyText(item);
      // derive rate text: prefer explicit rate, else build from price+perUnit, else fallback
      let rate = "";
      if (item.rate) rate = item.rate;
      else if (item.price != null) {
        const per = (item as any).perUnit || (item as any).unit;
        // use getPerUnitLabel helper for full rate string
        rate = getPerUnitLabel({ ...item, price: item.price, perUnit: per } as ReceiptItem);
      } else {
        rate = "-";
      }
      // escape html
      const safeName = String(item.name).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeQty = String(qty).replace(/</g, "&lt;");
      const safeRate = String(rate).replace(/</g, "&lt;");
      return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:2px 0;font-size:10px;border-bottom:1px dotted #ddd;">
      <span style="width:8%;text-align:left;">${i + 1}</span>
      <span style="width:42%;text-align:left;word-break:break-word;padding-right:4px;">${safeName}</span>
      <span style="width:15%;text-align:center;">${safeQty}</span>
      <span style="width:17%;text-align:right;word-break:break-word;">${safeRate}</span>
      <span style="width:18%;text-align:right;font-weight:bold;">${formatINR(item.lineTotal)}</span>
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${pdfTitle}</title>
<style>
@page { size: 58mm; margin: 5mm; }
body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 0; }
.receipt { width: 58mm; padding: 5px; }
.header { text-align: center; border-bottom: 2px double #000; padding-bottom: 5px; margin-bottom: 5px; }
.store-name { font-size: 16px; font-weight: bold; margin: 0; }
.store-info { font-size: 9px; color: #333; }
.date-time { text-align: center; font-size: 9px; margin: 3px 0; }
.items { margin: 5px 0; }
.total-line { border-top: 2px double #000; margin-top: 5px; padding-top: 5px; font-weight: bold; font-size: 13px; text-align: center; }
.payment { text-align: center; font-size: 12px; margin-top: 5px; }
.footer { text-align: center; font-size: 9px; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
</style></head>
<body><div class="receipt">
  <div class="header">
    <div class="store-name">GB RETAIL</div>
    <div class="store-info">Local Grocery Store | GST: 07ABCDE1234F1Z5</div>
  </div>
  <div class="date-time">${dateStr} | ${timeStr}${customerName ? ' | ' + customerName : ''}</div>
  <div class="items">${headerRow}${itemsHTML}</div>
  ${discount > 0 ? '<div style="text-align:right;font-size:10px;">Discount: -' + formatINR(discount) + '</div>' : ''}
  <div class="total-line">Total: ${formatINR(total)}</div>
  ${orderId ? '<div class="payment">Order: ' + orderId + '</div>' : ''}
  <div class="footer">Thank you for shopping with us!<br>Visit again!</div>
</div></body></html>`;
}

function formatINR(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
