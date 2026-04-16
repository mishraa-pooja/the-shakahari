/**
 * Checkout: prefill from saved profile (multi-address), detect first order,
 * show WhatsApp OTP panel with first-order gift messaging.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { LocationPicker, type LatLng } from "@/components/LocationPicker";
import { checkoutFormSchema, type CheckoutFormValues } from "@/lib/validations";
import { useCartStore } from "@/store/cartStore";
import type { OrderItemPayload } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import {
  buildOrderWhatsAppMessage,
  getWhatsAppDeepLink,
  type OrderWhatsAppParams,
} from "@/lib/whatsappLink";
import { useDeliveryProfileStore } from "@/store/deliveryProfileStore";
import { WhatsAppOtpPanel } from "@/components/WhatsAppOtpPanel";

const SLOT_OPTIONS = [
  { value: "12 PM", label: "12 PM" },
  { value: "1 PM", label: "1 PM" },
  { value: "2 PM", label: "2 PM" },
  { value: "3 PM", label: "3 PM" },
] as const;

export interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [orderSummary, setOrderSummary] = useState<OrderWhatsAppParams | null>(
    null
  );
  const [location, setLocation] = useState<LatLng | null>(null);
  const { items, getTotal, clearCart } = useCartStore();
  const { user, profile, refreshProfile } = useAuth();
  const savedLocal = useDeliveryProfileStore((s) => s.profile);
  const setSavedLocal = useDeliveryProfileStore((s) => s.setProfile);
  const markWhatsappVerified = useDeliveryProfileStore(
    (s) => s.markWhatsappVerified
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      landmark: "",
      pincode: "",
      slot: undefined,
      notes: "",
    },
  });

  const total = getTotal();
  const cartEmpty = items.length === 0;

  useEffect(() => {
    if (!open) return;
    if (user && profile) {
      form.reset({
        name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        landmark: profile.landmark ?? "",
        pincode: profile.pincode ?? "",
        slot: undefined,
        notes: "",
      });
      return;
    }
    if (savedLocal && savedLocal.addresses.length > 0) {
      const active =
        savedLocal.addresses.find(
          (a) => a.id === savedLocal.activeAddressId
        ) ?? savedLocal.addresses[0];
      form.reset({
        name: active.full_name || savedLocal.full_name,
        phone: active.phone || savedLocal.phone,
        address: active.address,
        landmark: active.landmark,
        pincode: active.pincode,
        slot: undefined,
        notes: "",
      });
    }
  }, [open, user, profile, savedLocal, form]);

  const handleLocationChange = useCallback((loc: LatLng) => {
    setLocation(loc);
  }, []);

  const handleAddressDetected = useCallback(
    (address: string) => {
      const current = form.getValues("address");
      if (!current || current.length < 5) {
        form.setValue("address", address, { shouldValidate: true });
      }
    },
    [form]
  );

  const handleSubmit = form.handleSubmit(async (data) => {
    if (cartEmpty) {
      toast.error("Your cart is empty.");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        address: data.address,
        landmark: data.landmark || undefined,
        pincode: data.pincode,
        slot: data.slot,
        notes: data.notes || undefined,
        items: items.map(
          (i): OrderItemPayload => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })
        ),
        total,
        paymentMethod: "COD" as const,
        latitude: location?.lat,
        longitude: location?.lng,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(json.error ?? "Sold out!", {
            duration: 8000,
            style: {
              background: "#7f1d1d",
              color: "#fecaca",
              border: "1px solid #dc2626",
              fontWeight: 700,
              fontSize: "15px",
            },
          });
        } else {
          toast.error(json.error ?? "Something went wrong.");
        }
        return;
      }

      const orderId = json.orderId as string;
      const firstOrder = Boolean(json.isFirstOrder);

      if (user) {
        try {
          const sb = getSupabaseBrowser();
          const { error: upErr } = await sb.from("profiles").upsert(
            {
              id: user.id,
              full_name: data.name,
              phone: data.phone,
              address: data.address,
              landmark: data.landmark || null,
              pincode: data.pincode,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          if (upErr) console.error("profile save:", upErr);
          else await refreshProfile();
        } catch (e) {
          console.error("profile save:", e);
        }
      }

      setSavedLocal({
        full_name: data.name,
        phone: data.phone,
        address: data.address,
        landmark: data.landmark,
        pincode: data.pincode,
      });

      clearCart();
      setSuccessOrderId(orderId);
      setIsFirstOrder(firstOrder);
      setOrderSummary({
        orderId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        landmark: data.landmark,
        pincode: data.pincode,
        slot: data.slot,
        notes: data.notes,
        items: payload.items,
        total,
        latitude: location?.lat,
        longitude: location?.lng,
      });
      toast.success("Order placed successfully!");
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSuccessOrderId(null);
      setOrderSummary(null);
      setIsFirstOrder(false);
      setLocation(null);
      form.reset();
    }
    onOpenChange(isOpen);
  };

  const whatsappUrl =
    orderSummary && getWhatsAppDeepLink(buildOrderWhatsAppMessage(orderSummary));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showClose={true}>
        {successOrderId ? (
          <>
            <DialogHeader>
              <DialogTitle>Order confirmed</DialogTitle>
              <DialogDescription>
                Thank you for choosing The Shaka-Hari.
                <br />
                Your order has been received successfully.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              <div className="rounded-md border border-gold/40 bg-gold/5 px-4 py-4 text-center">
                <p className="text-sm text-gold/60">Order ID</p>
                <p className="mt-1 text-xl font-semibold tracking-wide text-gold">
                  {successOrderId}
                </p>
              </div>
              <div className="rounded-md border border-gold/20 bg-gold/5 px-3 py-2 text-center text-sm text-gold/70">
                Payment: Cash on Delivery
              </div>
              <p className="text-center text-xs text-gold/50">
                We&apos;ll contact you shortly to confirm delivery.
              </p>

              {!user &&
              !savedLocal?.whatsapp_verified_at &&
              successOrderId &&
              orderSummary ? (
                <WhatsAppOtpPanel
                  orderId={successOrderId}
                  orderPhone10={orderSummary.phone}
                  customerName={orderSummary.name}
                  isFirstOrder={isFirstOrder}
                  onVerified={() => markWhatsappVerified()}
                />
              ) : null}

              {whatsappUrl ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => window.open(whatsappUrl, "_blank")}
                >
                  Confirm order on WhatsApp
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
              <DialogDescription>
                {user
                  ? "Your saved details are filled in. Update anything before ordering."
                  : "Fill in your delivery details. We remember them for next time."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-md border border-gold/40 bg-gold/5 px-3 py-2 text-center text-sm font-medium text-gold">
                Payment: COD (Cash on Delivery)
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" type="tel" {...form.register("phone")} />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Delivery Address *</Label>
                <Textarea
                  id="address"
                  rows={3}
                  {...form.register("address")}
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.address.message}
                  </p>
                )}
              </div>

              <LocationPicker
                value={location}
                onChange={handleLocationChange}
                onAddressDetected={handleAddressDetected}
                addressText={form.watch("address")}
              />

              <div className="grid gap-2">
                <Label htmlFor="landmark">Landmark (optional)</Label>
                <Input id="landmark" {...form.register("landmark")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input id="pincode" {...form.register("pincode")} />
                {form.formState.errors.pincode && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.pincode.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="slot">Delivery Slot *</Label>
                <Select
                  id="slot"
                  value={form.watch("slot") ?? ""}
                  {...form.register("slot", {
                    setValueAs: (v) => v || undefined,
                  })}
                >
                  <option value="">Select slot</option>
                  {SLOT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                {form.formState.errors.slot && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.slot.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" rows={2} {...form.register("notes")} />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || cartEmpty}>
                  {loading ? "Placing…" : "Place Order"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
