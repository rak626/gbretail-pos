# GB Retail — Shop Owner Runbook

## Overview

This runbook covers the day-to-day inventory operations shop owners perform in the GB Retail POS system.

**Three shops:** GB-SHOP-1001 (Main Bazaar), GB-SHOP-1002 (East End), GB-SHOP-1003 (West Side)

**Roles:**
- **SUPER_ADMIN** — manages the global master catalog (all shops)
- **SHOP_OWNER** — full shop access: enable/disable products, restock, manage staff
- **STAFF** — billing only; inventory only if `canManageInventory` is granted

---

## 1. Enable / Disable a Product at Your Shop

Products exist in the global **master catalog** (managed by SUPER_ADMIN). Each shop decides which master products to carry via **ShopProduct** rows.

### Enable a product
1. Open POS → Inventory
2. Find the product in the master catalog list (use `/` to search)
3. Click **Enable** (toggle switch in the Enabled column)
4. Set your shop price, stock quantity, and low-stock threshold
5. Toggle **Online** if you want customers to see it on the storefront

### Disable a product
1. Open POS → Inventory
2. Find the product
3. Click **Disable** (toggle switch)
4. The product is hidden from your shop's POS and online storefront. Past orders keep history.

> Disabling does not delete the product — it just removes it from your shop. Re-enable anytime.

---

## 2. Restock with Batches (Expiry / MRP Tracking)

When you receive new stock from a supplier, create a **batch** so expiry and MRP are tracked per lot.

### Restock a product
1. Open POS → Inventory
2. Find the product → click **Restock** (or the `+` stock button)
3. Enter:
   - **Add quantity** — how many units received
   - **Batch number** — supplier batch/lot number (required for packaged items)
   - **Expiry date** — leave blank for non-perishable items
   - **MRP** — printed maximum retail price on the pack
   - **Cost price** — what you paid (used for profit analytics)
   - **Sell price** — your shop's selling price (leave blank to keep current)
4. Click **Add to stock**

### How batches work
- **FEFO (First-Expired-First-Out):** When selling, the system deducts from the earliest-expiring batch first
- Stock quantity is incremented at the ShopProduct level AND at the batch level
- Expired batches are flagged in red in the inventory table

---

## 3. Low-Stock Alerts

Each product has a **low-stock threshold** (default 10 units). When stock drops to or below this threshold:

- The inventory table shows an **amber dot** and "Low • N units left"
- The stock health bar turns amber
- The product appears when you filter by **Low** stock
- Sales are **never blocked** — low stock is a warning only

### Out of stock
- Stock reaches 0 → **red dot**, "Out — restock now"
- The product shows as unavailable on the online storefront
- Customers cannot order it online

---

## 4. Manage Online Visibility

The online storefront only shows products that are:
1. **Enabled** at your shop (`isEnabled = true`)
2. **Online** (`isOnline = true`)
3. **In stock** (`stockQuantity > 0`)

### Toggle online visibility
1. Open POS → Inventory
2. Find the product
3. The **Online** column shows whether customers can see it on the storefront
4. To change: edit the product or use the ShopProduct settings

### Pricing online
- **Shop price** overrides the master catalog base price for your shop
- **Online price** (optional) adds a markup for online orders
- Effective online price = onlinePrice ?? shopPrice ?? basePrice

---

## 5. Offline Mode

The POS works online-only for billing. If your connection drops:

- The **Offline Banner** (red bar at top) shows you're offline
- Any bills attempted while offline are **queued** and replayed automatically when you reconnect
- The product catalog is cached locally — you can still browse/search products
- New products, restocks, and enable/disable changes require an internet connection

### Sync queued bills
- The banner shows "N bill(s) queued" with a **Sync** button
- Click Sync to manually retry queued bills
- Sync also happens automatically when connectivity is restored

---

## 6. Quick Reference

| Task | Where | What to click |
|------|-------|---------------|
| Enable/disable product | Inventory table | Toggle switch in Enabled column |
| Restock with batch | Inventory table | Restock button or `+` stock |
| Adjust stock (±1) | Inventory table | `−` / `+` buttons |
| Edit product details | Inventory table | Pencil button |
| Delete product | Inventory table | Trash button (soft delete) |
| Export inventory CSV | Inventory toolbar | Export button |
| Import products CSV | Inventory toolbar | Import button |
| View low-stock items | Inventory toolbar | Filter → Low |
| View out-of-stock items | Inventory toolbar | Filter → Out |
| Check expiring batches | Inventory table | Red "Expired" / amber "Expiring" badges |

---

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| Product not showing in POS | Check it's **Enabled** at your shop |
| Product not showing online | Check it's **Enabled** AND **Online** AND **in stock** |
| Can't restock | Check you're **online** (offline blocks writes) |
| Bill queued but not syncing | Click **Sync** in the offline banner, or check internet |
| Batch showing "Expired" | The batch's expiry date has passed — use remaining stock promptly |
| Margin showing negative | Selling price is below cost price — review pricing |

---

## Support

Contact your SUPER_ADMIN for:
- New products added to the master catalog
- Barcode or category changes
- User role changes (staff → shop owner, inventory access)
- Shop-level settings (delivery, pickup, online enablement)