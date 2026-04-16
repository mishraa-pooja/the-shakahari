/**
 * POST /api/orders — validate payload, detect first order, save to Supabase.
 */

import { NextResponse } from "next/server";
import { orderPayloadSchema } from "@/lib/validations";
import { getSupabase, getSupabaseServiceRole } from "@/lib/supabase";
import { generateOrderId } from "@/lib/orderId";
import { upsertCustomerOrderAnalytics } from "@/lib/customer-order-analytics";
import { getAllStock, decrementItemStock } from "@/lib/stock";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = orderPayloadSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message =
        Object.values(first).flat().find(Boolean) || "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const data = parsed.data;
    const orderId = generateOrderId();

    try {
      const supabase = getSupabase();
      const serviceDb = getSupabaseServiceRole() ?? supabase;

      // Per-item stock check
      const biryanis = data.items.filter(
        (i: { id: string }) =>
          i.id !== "raita" && i.id !== "gulab-jamun"
      );

      if (biryanis.length > 0) {
        const stockMap = await getAllStock(serviceDb);
        const insufficient: string[] = [];

        for (const item of biryanis) {
          const avail = stockMap[item.id] ?? 0;
          if (avail < item.quantity) {
            insufficient.push(
              avail <= 0
                ? `${item.name} is sold out`
                : `Only ${avail} ${item.name} left (you ordered ${item.quantity})`
            );
          }
        }

        if (insufficient.length > 0) {
          return NextResponse.json(
            { error: insufficient.join(". ") + "." },
            { status: 409 }
          );
        }

        for (const item of biryanis) {
          const result = await decrementItemStock(
            serviceDb,
            item.id,
            item.quantity
          );
          if (result < 0) {
            return NextResponse.json(
              { error: `${item.name} just sold out. Please refresh and try again.` },
              { status: 409 }
            );
          }
        }
      }

      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("phone", data.phone);

      const isFirstOrder = (count ?? 0) === 0;

      const row = {
        order_id: orderId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        landmark: data.landmark ?? null,
        pincode: data.pincode,
        slot: data.slot,
        notes: data.notes ?? null,
        items: data.items,
        total: data.total,
        payment_method: data.paymentMethod,
        status: "pending",
        is_first_order: isFirstOrder,
        source: "website",
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      };
      const { error } = await supabase.from("orders").insert(row);

      if (error) {
        console.error("Supabase insert error:", error);
        return NextResponse.json(
          { error: "Failed to save order. Please try again." },
          { status: 500 }
        );
      }

      const admin = getSupabaseServiceRole();
      if (admin) {
        const agg = await upsertCustomerOrderAnalytics(admin, {
          phone: data.phone,
          customerName: data.name,
          items: data.items,
        });
        if (!agg.ok) {
          console.warn("customer_order_analytics skipped:", agg.error);
        }
      } else {
        console.warn(
          "orders: SUPABASE_SERVICE_ROLE_KEY unset — customer_order_analytics not updated"
        );
      }

      return NextResponse.json({
        success: true,
        orderId,
        isFirstOrder,
      });
    } catch (e) {
      console.error("Supabase error:", e);
      return NextResponse.json(
        { error: "Database unavailable. Please try again later." },
        { status: 503 }
      );
    }
  } catch (e) {
    console.error("Orders API error:", e);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
