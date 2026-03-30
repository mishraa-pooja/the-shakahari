/**
 * WhatsApp OTP verification panel shown after order placement.
 * Shows first-order gift messaging when applicable.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  orderId: string;
  orderPhone10: string;
  /** Saved to phone_verified_profiles.full_name on successful verify (server). */
  customerName?: string;
  isFirstOrder?: boolean;
  onVerified: () => void;
};

const autoSendGuard = new Set<string>();

export function WhatsAppOtpPanel({
  orderId,
  orderPhone10,
  customerName,
  isFirstOrder = false,
  onVerified,
}: Props) {
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [altOpen, setAltOpen] = useState(false);
  const [altPhone, setAltPhone] = useState("");

  const sendCode = useCallback(
    async (waOverride?: string) => {
      setSending(true);
      setSendError(null);
      try {
        const res = await fetch("/api/auth/whatsapp-otp/send", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            orderPhone: orderPhone10,
            ...(waOverride ? { waPhone: waOverride } : {}),
          }),
        });
        const data = (await res.json()) as { error?: string; sentTo?: string };
        if (!res.ok) {
          setSendError(data.error ?? "Could not send WhatsApp.");
          return;
        }
        setSentTo(data.sentTo ?? `+91 ${orderPhone10}`);
        toast.success("Code sent on WhatsApp");
      } catch {
        setSendError("Network error. Try again.");
      } finally {
        setSending(false);
      }
    },
    [orderId, orderPhone10]
  );

  useEffect(() => {
    const key = `${orderId}:${orderPhone10}`;
    if (autoSendGuard.has(key)) return;
    autoSendGuard.add(key);
    void sendCode();
  }, [orderId, orderPhone10, sendCode]);

  const handleVerify = async () => {
    const code = otp.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code from WhatsApp.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/whatsapp-otp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          ...(customerName?.trim()
            ? { full_name: customerName.trim() }
            : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Verification failed.");
        return;
      }
      setVerified(true);
      onVerified();
      toast.success("Verified! Your details are saved for faster checkout.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendAlt = () => {
    const d = altPhone.replace(/\D/g, "");
    const ten =
      d.length === 12 && d.startsWith("91")
        ? d.slice(2)
        : d.length === 10
          ? d
          : "";
    if (!/^[6-9]\d{9}$/.test(ten)) {
      toast.error("Enter a valid 10-digit Indian mobile for WhatsApp.");
      return;
    }
    void sendCode(ten);
  };

  if (verified) {
    return (
      <div className="rounded-md border border-gold/35 bg-gold/10 px-3 py-3 text-center text-sm text-gold/90">
        Verified! Your details are saved for faster checkout next time.
        {isFirstOrder && (
          <p className="mt-1 text-xs font-medium text-gold">
            🎁 A free gift will be included with your first order!
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-gold/30 bg-gold/5 p-4 text-left">
      <p className="text-sm font-medium text-gold">
        {isFirstOrder
          ? "🎁 Welcome! Verify to save your details"
          : "Verify on WhatsApp"}
      </p>
      <p className="text-xs text-gold/65">
        {isFirstOrder
          ? "As this is your first order, please enter the OTP sent on WhatsApp to save your details so checkout is faster next time. We also have a free gift for first-time verified customers!"
          : "Enter the OTP sent on WhatsApp to save your details for faster checkout next time."}
      </p>

      {sendError ? (
        <p className="text-xs text-amber-300/90">{sendError}</p>
      ) : sending && !sentTo ? (
        <p className="text-xs text-gold/60">Sending code to WhatsApp…</p>
      ) : sentTo ? (
        <p className="text-xs text-gold/80">
          Code sent to <span className="font-medium text-gold">{sentTo}</span>
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="wa-otp">6-digit code</Label>
        <Input
          id="wa-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          maxLength={8}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={verifying || !sentTo}
        onClick={() => void handleVerify()}
      >
        {verifying ? "Checking…" : "Verify code"}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full border-gold/40"
        disabled={sending}
        onClick={() => void sendCode()}
      >
        {sending ? "Sending…" : "Resend to order number"}
      </Button>

      <button
        type="button"
        className="w-full text-center text-xs text-gold/70 underline decoration-gold/40 underline-offset-2 hover:text-gold"
        onClick={() => setAltOpen((o) => !o)}
      >
        Use a different WhatsApp number
      </button>

      {altOpen ? (
        <div className="space-y-2 border-t border-gold/20 pt-3">
          <Label htmlFor="wa-alt">WhatsApp number (10 digits)</Label>
          <Input
            id="wa-alt"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="Other mobile"
            value={altPhone}
            onChange={(e) =>
              setAltPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={sending}
            onClick={() => void handleResendAlt()}
          >
            Send code to this number
          </Button>
        </div>
      ) : null}
    </div>
  );
}
