# Legacy components — archived for maintainability
- `CartPanel.tsx`, `CatalogGrid.tsx`, `OfflineIndicator.tsx` are no longer used (replaced by `CartTable`+`BillSummary`, inline grid in `app/page.tsx`, and `useOnlineStatus` hook).
- Kept for reference until next major clean. Safe to delete after verifying no imports (grep showed 0 usages as of 2026-09-25).
