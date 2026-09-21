export function generateReceiptHTML(
  items: { name: string; unit: string; lineTotal: number }[],
  total: number,
  discount: number,
  customerName?: string,
  orderId?: string
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN");
  const timeStr = now.toLocaleTimeString("en-IN");

  const itemsHTML = items
    .map(
      (item, i) => `
    <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px;">
      <span>${i + 1}. ${item.name}</span>
      <span>${item.unit} ${formatINR(item.lineTotal)}</span>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
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
  <div class="items">${itemsHTML}</div>
  ${discount > 0 ? '<div style="text-align:right;font-size:10px;">Discount: -' + formatINR(discount) + '</div>' : ''}
  <div class="total-line">Total: ${formatINR(total)}</div>
  ${orderId ? '<div class="payment">Order: ' + orderId + '</div>' : ''}
  <div class="footer">Thank you for shopping with us!<br>Visit again!</div>
</div></body></html>`;
}

function formatINR(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
