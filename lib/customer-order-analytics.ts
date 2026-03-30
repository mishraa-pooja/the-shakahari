/**
 * Merge line items into per-phone aggregates for customer_order_analytics.
 * Server-only; used after a successful order insert.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type OrderLineForAnalytics = {
  id: string;
  name: string;
  quantity: number;
};

export type DishTotalRow = {
  name: string;
  units: number;
};

/** Map menu item id -> { name, cumulative units } */
export type DishTotalsMap = Record<string, DishTotalRow>;

export type TopDishEntry = {
  id: string;
  name: string;
  units: number;
};

const TOP_LIMIT = 15;

export function mergeDishTotals(
  existing: DishTotalsMap,
  items: OrderLineForAnalytics[]
): DishTotalsMap {
  const next: DishTotalsMap = { ...existing };
  for (const item of items) {
    const id = item.id.trim();
    if (!id) continue;
    const qty = Math.max(0, Math.floor(Number(item.quantity)) || 0);
    if (qty === 0) continue;
    const prev = next[id];
    next[id] = {
      name: item.name?.trim() || prev?.name || id,
      units: (prev?.units ?? 0) + qty,
    };
  }
  return next;
}

export function computeTopDishes(
  totals: DishTotalsMap,
  limit = TOP_LIMIT
): TopDishEntry[] {
  return Object.entries(totals)
    .map(([id, v]) => ({
      id,
      name: v.name,
      units: v.units,
    }))
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);
}

function parseDishTotals(raw: unknown): DishTotalsMap {
  if (!raw || typeof raw !== "object") return {};
  const out: DishTotalsMap = {};
  for (const [id, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const o = val as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : id;
    const units = typeof o.units === "number" && o.units >= 0 ? o.units : 0;
    if (units > 0) out[id] = { name, units };
  }
  return out;
}

/**
 * Upsert analytics row for phone after an order. Requires service_role client.
 */
export async function upsertCustomerOrderAnalytics(
  supabase: SupabaseClient,
  input: {
    phone: string;
    customerName: string;
    items: OrderLineForAnalytics[];
  }
): Promise<{ ok: boolean; error?: string }> {
  const phone = input.phone.replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return { ok: false, error: "invalid phone" };
  }

  const now = new Date().toISOString();

  const { data: row, error: selErr } = await supabase
    .from("customer_order_analytics")
    .select("total_orders, dish_totals, first_order_at")
    .eq("phone", phone)
    .maybeSingle();

  if (selErr) {
    console.error("customer_order_analytics select:", selErr);
    return { ok: false, error: selErr.message };
  }

  const existingTotals = parseDishTotals(row?.dish_totals);
  const dish_totals = mergeDishTotals(existingTotals, input.items);
  const top_dishes = computeTopDishes(dish_totals);
  const total_orders =
    typeof row?.total_orders === "number" ? row.total_orders + 1 : 1;

  const payload = {
    phone,
    total_orders,
    dish_totals,
    top_dishes,
    last_customer_name: input.customerName.trim() || null,
    last_order_at: now,
    updated_at: now,
    ...(row
      ? {}
      : {
          first_order_at: now,
        }),
  };

  if (row) {
    const { error: upErr } = await supabase
      .from("customer_order_analytics")
      .update({
        total_orders: payload.total_orders,
        dish_totals: payload.dish_totals,
        top_dishes: payload.top_dishes,
        last_customer_name: payload.last_customer_name,
        last_order_at: payload.last_order_at,
        updated_at: payload.updated_at,
      })
      .eq("phone", phone);
    if (upErr) {
      console.error("customer_order_analytics update:", upErr);
      return { ok: false, error: upErr.message };
    }
  } else {
    const { error: insErr } = await supabase
      .from("customer_order_analytics")
      .insert(payload);
    if (insErr) {
      console.error("customer_order_analytics insert:", insErr);
      return { ok: false, error: insErr.message };
    }
  }

  return { ok: true };
}
