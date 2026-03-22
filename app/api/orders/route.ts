/**
 * POST /api/orders — validate payload, save to Supabase, return orderId.
 */

import { NextResponse } from "next/server";
import { orderPayloadSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";
import { generateOrderId } from "@/lib/orderId";

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
    } catch (e) {
      console.error("Supabase error:", e);
      return NextResponse.json(
        { error: "Database unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, orderId });
  } catch (e) {
    console.error("Orders API error:", e);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
