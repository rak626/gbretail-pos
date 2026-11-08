// Thermal tax-invoice template modelled on the format used by large Indian
// retailers: centred store identity, bill meta, GST-grouped item table,
// payment details, tax summary, loyalty line and footer.

import { UI } from "@/config/constants";
import type { ReceiptItem } from "@/types";
import { code128Svg } from "./barcode";
import { computeGst, DEFAULT_GST_RATE, formatBillTimestamp, formatGstDate, money } from "./tax";
import type { ReceiptContext, ReceiptMeta, ReceiptPayment, ReceiptShop } from "./types";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function widthMmFrom(value: string | null | undefined): number {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  const n = match ? Number(match[1]) : 80;
  return Number.isFinite(n) && n >= 40 ? n : 80;
}

/** Quantity without its unit (the UOM gets its own column, like the sample). */
function qtyValue(item: ReceiptItem): string {
  if (item.weight != null && item.weight > 0) return Number(item.weight).toFixed(3);
  if (item.quantity != null && Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0) {
    return Number(item.quantity).toFixed(3);
  }
  if (item.qty) {
    const num = Number(String(item.qty).replace(/[^\d.]/g, ""));
    if (Number.isFinite(num) && num > 0) return num.toFixed(3);
    return item.qty;
  }
  return "1.000";
}

function uomLabel(item: ReceiptItem): string {
  const raw = String(item.perUnit || item.unit || "").toLowerCase();
  if (raw.includes("kg") || raw.includes("kgs")) return "KG";
  if (raw === "g" || raw === "gm" || raw === "gms" || raw.includes("gram")) return "G";
  if (raw.includes("pc") || raw === "ea" || raw === "each" || raw === "nos" || raw === "no") return "EA";
  if (raw.includes("pack") || raw.includes("pkt") || raw.includes("packet")) return "PK";
  if (raw.includes("ltr") || raw.includes("litre") || raw === "l") return "L";
  const fallback = String(item.perUnit || item.unit || "EA").trim();
  return fallback ? fallback.toUpperCase() : "EA";
}

function unitPrice(item: ReceiptItem): number | null {
  if (item.price != null && Number.isFinite(Number(item.price))) return Number(item.price);
  if (item.rate) {
    const n = Number(String(item.rate).replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function articleCode(item: ReceiptItem): string {
  const code = String(item.articleCode ?? "").trim();
  if (code) return code;
  return "—";
}

function paymentReceived(payments: ReceiptPayment[]): number {
  return payments
    .filter((p) => !/khata|credit|payable/i.test(String(p.type)))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

function lineCount(items: ReceiptItem[]): string {
  return items.length.toFixed(2);
}

function totalQty(items: ReceiptItem[]): string {
  const sum = items.reduce((acc, item) => {
    const qty = Number(qtyValue(item).replace(/[^\d.]/g, ""));
    return acc + (Number.isFinite(qty) ? qty : 0);
  }, 0);
  return sum.toFixed(3);
}

function hasValue(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

function headerHtml(shop: ReceiptShop | null | undefined): string {
  if (!shop) return `<div class="store">Retail Store</div>`;
  const storeName = esc(String(shop.receiptName ?? "").trim() || String(shop.name ?? "").trim() || "Retail Store");
  const address = String(shop.address ?? "").trim();
  const gstDate = formatGstDate(shop.gstDate);
  const gst = [
    hasValue(shop.gstin) ? `<span>GST : ${esc(shop.gstin)}</span>` : "",
    gstDate ? `<span>De ${esc(gstDate)}</span>` : "",
  ].filter(Boolean).join("");
  return `
    <div class="store">${storeName}</div>
    ${hasValue(shop.city) ? `<div class="city">${esc(shop.city)}</div>` : ""}
    ${hasValue(shop.companyName) ? `<div class="company">${esc(shop.companyName)}</div>` : ""}
    ${address ? `<div class="addr">${esc(address)}</div>` : ""}
    ${gst ? `<div class="gst">${gst}</div>` : ""}
    ${hasValue(shop.fssai) ? `<div>FSSAI LIC NO: ${esc(shop.fssai)}</div>` : ""}
    ${hasValue(shop.franchiseNote) ? `<div class="tiny">(${esc(shop.franchiseNote)})</div>` : ""}
    ${hasValue(shop.phone) ? `<div>Contact : ${esc(shop.phone)}</div>` : ""}
  `;
}

function metaHtml(meta: ReceiptMeta | null | undefined, draft: boolean, billNo: string): string {
  const when = formatBillTimestamp(meta?.billDate ?? new Date());
  const session = String(meta?.sessionNo ?? "").trim();
  const counter = String(meta?.counterNo ?? "").trim();
  const cashier = String(meta?.cashier ?? "").trim();
  const customer = [meta?.customerName, meta?.customerPhone].filter(Boolean).join(" · ");
  return `
    <div class="meta">
      <div class="row"><span>Bill Date: ${esc(when)}</span>${session ? `<span>Session No: ${esc(session)}</span>` : ""}</div>
      <div class="row"><span>Bill No: ${esc(billNo)}</span>${counter ? `<span>Counter No: ${esc(counter)}</span>` : ""}</div>
      ${cashier || draft ? `<div class="row"><span>${cashier ? `Cashier: ${esc(cashier)}` : ""}</span><span>${draft ? "PRE-BILL" : ""}</span></div>` : ""}
      ${customer ? `<div class="row"><span>Customer: ${esc(customer)}</span><span></span></div>` : ""}
    </div>
  `;
}

function itemsHtml(items: ReceiptItem[], gstRate: number, discount: number, gross: number): string {
  const rows = items.map((item) => {
    const qty = qtyValue(item);
    const uom = uomLabel(item);
    const price = unitPrice(item);
    const lineDiscount = Number(item.discount) || 0;
    const hsn = String(item.hsn ?? "").trim();
    return `
      <tr class="item-desc">
        <td colspan="4" class="desc">${esc(item.name)}${item.mrp != null ? ` <span class="mrp">MRP ${money(item.mrp)}</span>` : ""}</td>
        <td class="right">${esc(hsn)}</td>
      </tr>
      <tr class="item-values">
        <td>${esc(articleCode(item))}</td>
        <td class="center">${esc(qty)} ${esc(uom)}</td>
        <td class="right">${price == null ? "—" : money(price)}</td>
        <td class="right">${money(lineDiscount)}</td>
        <td class="right">${money(item.lineTotal)}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="items">
      <colgroup>
        <col style="width:22%"><col style="width:19%"><col style="width:20%"><col style="width:16%"><col style="width:23%">
      </colgroup>
      <thead>
        <tr class="desc-head">
          <th colspan="4" class="left">Article Description</th>
          <th class="right">HSN</th>
        </tr>
        <tr class="col-head">
          <th class="left">Article Code</th>
          <th class="center">Qty. UOM</th>
          <th class="right">Sell Price</th>
          <th class="right">Discount</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr class="gst-group"><td colspan="5">GST ${gstRate.toFixed(2)}%</td></tr>
        ${rows}
        <tr class="items-total">
          <td colspan="2">Items: ${lineCount(items)}</td>
          <td>Qty: ${totalQty(items)}</td>
          <td class="right">Disc: ${money(discount)}</td>
          <td class="right">${money(gross)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function totalsHtml(gross: number, discount: number, total: number, tax: number, received: number, due: number, balancePaid: number): string {
  return `
    <table class="totals">
      <tbody>
        <tr><td>Gross sale value :</td><td class="right">${money(gross)}</td></tr>
        ${discount > 0 ? `<tr><td>Discount :</td><td class="right">-${money(discount)}</td></tr>` : ""}
        <tr><td>Tax :</td><td class="right">${money(tax)}</td></tr>
        <tr class="strong"><td>Net Payable :</td><td class="right">${money(total)}</td></tr>
        <tr><td>Received Amount :</td><td class="right">${money(received)}</td></tr>
        <tr><td>Balance Paid :</td><td class="right">${money(balancePaid)}</td></tr>
        ${due > 0 ? `<tr class="strong"><td>Balance Due :</td><td class="right">${money(due)}</td></tr>` : ""}
      </tbody>
    </table>
    <div class="rule"></div>
  `;
}

function paymentsHtml(payments: ReceiptPayment[]): string {
  const rows = payments.map((p) => `
    <tr>
      <td class="left">${esc(p.type || "PAID")}</td>
      <td class="left">${esc(p.reference || "-")}</td>
      <td class="right">${money(p.amount)}</td>
    </tr>
  `).join("");
  return `
    <div class="section">Payment Details</div>
    <table class="pay">
      <colgroup><col style="width:26%"><col style="width:48%"><col style="width:26%"></colgroup>
      <thead><tr><th class="left">Type</th><th class="left">Reference No:</th><th class="right">Amount:</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="dashed"></div>
  `;
}

function taxHtml(rate: number, taxable: number, cgst: number, sgst: number, cess: number, total: number): string {
  return `
    <div class="section">Tax Summary</div>
    <table class="tax">
      <colgroup><col style="width:12%"><col style="width:22%"><col style="width:16%"><col style="width:16%"><col style="width:14%"><col style="width:20%"></colgroup>
      <thead>
        <tr><th class="left">%</th><th class="right">Taxable</th><th class="right">CGST:</th><th class="right">SGST:</th><th class="right">CESS:</th><th class="right">Total:</th></tr>
      </thead>
      <tbody>
        <tr><td>${rate.toFixed(2)}</td><td class="right">${money(taxable)}</td><td class="right">${money(cgst)}</td><td class="right">${money(sgst)}</td><td class="right">${money(cess)}</td><td class="right">${money(total)}</td></tr>
        <tr class="strong"><td>Total</td><td class="right">${money(taxable)}</td><td class="right">${money(cgst)}</td><td class="right">${money(sgst)}</td><td class="right">${money(cess)}</td><td class="right">${money(total)}</td></tr>
      </tbody>
    </table>
  `;
}

export function generateReceiptHtml(ctx: ReceiptContext): string {
  const { items, total, discount, shop, meta } = ctx;
  const safeTotal = Number(total) || 0;
  const safeDiscount = Number(discount) || 0;
  const itemsGross = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
  const gross = itemsGross > 0 ? itemsGross : safeTotal + safeDiscount;
  const gstRate = Number(meta?.gstRate ?? shop?.gstRate ?? DEFAULT_GST_RATE) || 0;
  const tax = computeGst(safeTotal, gstRate, gross);

  const widthMm = widthMmFrom(meta?.widthMm ?? UI.RECEIPT_WIDTH_MM);
  const printableWidth = `${Math.max(40, widthMm - 6)}mm`;

  const billNo = String(meta?.billNo ?? "").trim();
  const draft = meta?.isDraft ?? (!billNo || /draft|not saved/i.test(billNo));
  const displayBillNo = billNo || "DRAFT — NOT SAVED";
  const title = String(meta?.title ?? "").trim() || (draft ? "PRE-BILL" : "TAX INVOICE");
  const barcode = draft ? "" : code128Svg(billNo);

  const payments: ReceiptPayment[] = meta?.payments?.length
    ? meta.payments
    : [{ type: draft ? "PAYABLE" : "PAID", reference: "-", amount: safeTotal }];
  const received = paymentReceived(payments);
  const balancePaid = Math.max(0, received - safeTotal);
  const due = Math.max(0, safeTotal - received);

  const loyaltyPhone = String(meta?.customerPhone ?? "").trim();
  const footer = String(shop?.receiptFooter ?? "").trim() || "Thank's for shopping with us.";
  const poweredBy = String(shop?.poweredBy ?? "").trim() || "GB Retail";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${esc(displayBillNo)}</title>
<style>
  @page { margin: 3mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: #fff; color: #000; font-family: "Courier New", ui-monospace, monospace; font-size: 10px; line-height: 1.35; }
  .receipt { width: ${printableWidth}; margin: 0 auto; padding: 2px 0; }
  .head { text-align: center; padding-bottom: 4px; }
  .store { font-size: 15px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; text-decoration: underline; }
  .city { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .company { font-size: 9.5px; font-weight: 700; margin-top: 3px; text-transform: uppercase; }
  .addr { font-size: 9px; }
  .gst { display: flex; justify-content: center; gap: 10px; font-size: 9px; }
  .tiny { font-size: 8px; }
  .doc-title { text-align: center; font-size: 15px; font-weight: 800; letter-spacing: 2px; margin: 6px 0 2px; }
  .barcode { text-align: center; margin: 4px 0; }
  .barcode svg { max-width: 100%; height: 42px; }
  .meta { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 0; font-size: 9.5px; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .items th, .items td { padding: 1px 0; vertical-align: top; }
  .desc-head { border-bottom: 1px solid #000; }
  .desc-head th, .col-head th { font-size: 8.5px; font-weight: 700; }
  .col-head th { white-space: nowrap; }
  .gst-group td { font-weight: 700; padding-top: 3px; }
  .item-desc td { padding-top: 2px; }
  .item-desc .desc { word-break: break-word; }
  .item-values td { font-size: 9.5px; }
  .mrp { font-size: 8px; font-weight: 400; }
  .items-total { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: 700; font-size: 9px; }
  .totals { margin-top: 2px; }
  .totals td { padding: 1px 0; font-size: 9.5px; }
  .totals td:first-child { text-align: right; padding-right: 6px; }
  .rule { border-top: 1px solid #000; margin: 2px 0 0; }
  .strong { font-weight: 700; }
  .section { text-align: center; font-weight: 700; margin: 6px 0 2px; }
  .pay th, .pay td, .tax th, .tax td { font-size: 8.5px; padding: 1px 0; }
  .dashed { border-top: 1px dashed #000; margin: 3px 0 0; }
  .loyalty { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: 700; padding: 3px 0; margin-top: 5px; font-size: 9.5px; }
  .footer { font-size: 8.5px; margin-top: 5px; }
  .powered { text-align: center; font-weight: 700; margin-top: 14px; letter-spacing: 1px; }
  .right { text-align: right; } .left { text-align: left; } .center { text-align: center; }
</style></head>
<body><div class="receipt">
  <div class="head">${headerHtml(shop)}</div>
  <div class="doc-title">${esc(title)}</div>
  ${barcode ? `<div class="barcode">${barcode}</div>` : ""}
  ${metaHtml(meta, draft, displayBillNo)}
  ${itemsHtml(items, gstRate, safeDiscount, gross)}
  ${totalsHtml(gross, safeDiscount, safeTotal, tax.tax, received, due, balancePaid)}
  ${paymentsHtml(payments)}
  ${taxHtml(gstRate, tax.taxable, tax.cgst, tax.sgst, tax.cess, safeTotal)}
  ${loyaltyPhone ? `<div class="loyalty">Loyalty Points Added to Mobile: #${esc(loyaltyPhone)}</div>` : ""}
  <div class="footer">${esc(footer)}</div>
  <div class="powered">Powered By ${esc(poweredBy)}</div>
</div></body></html>`;
}
