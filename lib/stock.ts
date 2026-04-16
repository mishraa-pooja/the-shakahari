/**
 * Server-side per-item stock helpers.
 * Keys in store_config: "stock:paneer-biryani", "stock:veg-dum-biryani", etc.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const STOCK_PREFIX = "stock:";

/** Biryani item IDs that are stock-tracked. */
export const TRACKED_IDS = [
  "paneer-biryani",
  "veg-dum-biryani",
  "soya-chaap-biryani",
  "mushroom-biryani",
];

function stockKey(itemId: string) {
  return `${STOCK_PREFIX}${itemId}`;
}

export type StockMap = Record<string, number>;

/** Fetch stock for all tracked items. */
export async function getAllStock(db: SupabaseClient): Promise<StockMap> {
  const keys = TRACKED_IDS.map(stockKey);
  const { data } = await db
    .from("store_config")
    .select("key, value")
    .in("key", keys);

  const map: StockMap = {};
  for (const id of TRACKED_IDS) map[id] = 0;
  if (data) {
    for (const row of data) {
      const id = row.key.replace(STOCK_PREFIX, "");
      map[id] = parseInt(row.value, 10) || 0;
    }
  }
  return map;
}

/** Total stock across all tracked items. */
export async function getTotalStock(db: SupabaseClient): Promise<number> {
  const map = await getAllStock(db);
  return Object.values(map).reduce((a, b) => a + b, 0);
}

/** Get stock for a single item. */
export async function getItemStock(
  db: SupabaseClient,
  itemId: string
): Promise<number> {
  const { data } = await db
    .from("store_config")
    .select("value")
    .eq("key", stockKey(itemId))
    .single();
  return parseInt(data?.value ?? "0", 10);
}

/** Set stock for a single item. */
export async function setItemStock(
  db: SupabaseClient,
  itemId: string,
  count: number
): Promise<void> {
  const { error } = await db.from("store_config").upsert(
    {
      key: stockKey(itemId),
      value: String(count),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) {
    console.error("setItemStock upsert error:", error);
    throw new Error(`Failed to set stock for ${itemId}: ${error.message}`);
  }
}

/**
 * Decrement stock for a single item by qty.
 * Returns new count, or -1 if insufficient.
 */
export async function decrementItemStock(
  db: SupabaseClient,
  itemId: string,
  qty: number
): Promise<number> {
  const current = await getItemStock(db, itemId);
  if (current < qty) return -1;
  const newVal = current - qty;
  await setItemStock(db, itemId, newVal);
  return newVal;
}

// Legacy compat wrappers
export async function getStock(db: SupabaseClient): Promise<number> {
  return getTotalStock(db);
}

export async function decrementStock(
  db: SupabaseClient,
  _qty: number
): Promise<number> {
  // No-op — callers should use decrementItemStock instead
  return getTotalStock(db);
}
