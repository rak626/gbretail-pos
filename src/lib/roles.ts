// Human role labels — API/DB values stay UPPER_SNAKE, display never shows them.
// All UI (badges, tooltips, drawers, denied copy) must use roleLabel().

export function roleLabel(role?: string | null): string {
  if (role === "SHOP_OWNER") return "Shop Owner";
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "STAFF") return "Staff";
  return role ?? "—";
}
