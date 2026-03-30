/**
 * Sign in via WhatsApp OTP only.
 * User enters phone → OTP sent to WhatsApp → verified → device session saved.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeliveryProfileStore } from "@/store/deliveryProfileStore";
import { fetchAddressesFromServer } from "@/lib/sync-addresses";

export interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const autoSendGuard = new Set<string>();

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const markWhatsappVerified = useDeliveryProfileStore(
    (s) => s.markWhatsappVerified
  );
  const setProfile = useDeliveryProfileStore((s) => s.setProfile);
  const addAddress = useDeliveryProfileStore((s) => s.addAddress);

  useEffect(() => {
    if (!open) {
      setStep("phone");
      setOtp("");
      setDisplayName("");
      setSentTo(null);
      setSendError(null);
    }
  }, [open]);

  const sendCode = useCallback(
    async (phoneNum: string) => {
      setSending(true);
      setSendError(null);
      try {
        const res = await fetch("/api/auth/whatsapp-otp/send", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: `login-${Date.now()}`,
            orderPhone: phoneNum,
          }),
        });
        const data = (await res.json()) as { error?: string; sentTo?: string };
        if (!res.ok) {
          setSendError(data.error ?? "Could not send WhatsApp OTP.");
          return false;
        }
        setSentTo(data.sentTo ?? `+91 ${phoneNum}`);
        toast.success("OTP sent on WhatsApp");
        return true;
      } catch {
        setSendError("Network error. Try again.");
        return false;
      } finally {
        setSending(false);
      }
    },
    []
  );

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    const ten =
      cleaned.length === 12 && cleaned.startsWith("91")
        ? cleaned.slice(2)
        : cleaned.length === 10
          ? cleaned
          : "";
    if (!/^[6-9]\d{9}$/.test(ten)) {
      toast.error("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setPhone(ten);
    const ok = await sendCode(ten);
    if (ok) setStep("otp");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
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
          ...(displayName.trim() ? { full_name: displayName.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Verification failed.");
        return;
      }

      // Restore addresses from Supabase (phone_verified_profiles.saved_addresses)
      let restored = false;
      try {
        const { addresses: dbAddresses, full_name: dbName } =
          await fetchAddressesFromServer(phone);
        if (dbAddresses.length > 0) {
          const first = dbAddresses[0];
          setProfile({
            full_name: first.full_name || dbName || displayName.trim() || "",
            phone,
            address: first.address,
            landmark: first.landmark,
            pincode: first.pincode,
          });
          for (let i = 1; i < dbAddresses.length; i++) {
            addAddress(dbAddresses[i]);
          }
          restored = true;
        }
      } catch {
        /* non-critical */
      }

      if (!restored) {
        setProfile({
          full_name: displayName.trim() || "",
          phone,
          address: "",
          pincode: "",
        });
      }

      markWhatsappVerified();
      toast.success("Signed in via WhatsApp!");
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>
            {step === "phone" ? "Sign in with WhatsApp" : "Enter OTP"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "We'll send a verification code to your WhatsApp. No password needed."
              : `Enter the 6-digit code sent to ${sentTo ?? "your WhatsApp"}.`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="login-name">Your name (optional)</Label>
              <Input
                id="login-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                placeholder="For your saved profile"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login-phone">WhatsApp Number</Label>
              <Input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                maxLength={10}
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                autoComplete="tel"
                required
              />
            </div>
            {sendError && (
              <p className="text-xs text-amber-300/90">{sendError}</p>
            )}
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? "Sending OTP…" : "Send OTP on WhatsApp"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            {sentTo && (
              <p className="text-xs text-gold/80">
                Code sent to{" "}
                <span className="font-medium text-gold">{sentTo}</span>
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="login-otp">6-digit code</Label>
              <Input
                id="login-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? "Verifying…" : "Verify & Sign in"}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-gold/40"
                disabled={sending}
                onClick={() => void sendCode(phone)}
              >
                {sending ? "Sending…" : "Resend"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-gold/80"
                onClick={() => setStep("phone")}
              >
                Change number
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
