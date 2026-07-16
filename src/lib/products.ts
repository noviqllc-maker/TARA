// src/lib/products.ts
// Single source of truth for the shop (non-consumable) product IDs. These strings
// MUST match the product identifiers configured in App Store Connect / RevenueCat
// exactly. They are also used as the report kind, the report-cache key, and the
// ownership key — so changing them here changes them everywhere.
export const SHOP_PRODUCT_IDS = [
  'yearaheadtarareport1',
  'birthblueprinttara1',
  'dosharemediestara1',
] as const;

export type ShopProductId = (typeof SHOP_PRODUCT_IDS)[number];
