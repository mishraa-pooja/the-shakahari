"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SavedDeliveryProfile } from "@/store/deliveryProfileStore";
import { useDeliveryProfileStore } from "@/store/deliveryProfileStore";

export type AddAddressModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SavedDeliveryProfile | null;
};

export function AddAddressModal({
  open,
  onOpenChange,
  profile,
}: AddAddressModalProps) {
  const addAddress = useDeliveryProfileStore((s) => s.addAddress);

  const [label, setLabel] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    const nextNum = profile.addresses.length + 1;
    setLabel(nextNum === 2 ? "Work" : `Address ${nextNum}`);
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setAddress("");
    setLandmark("");
    setPincode("");
  }, [open, profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error("No saved profile. Sign in or place an order first.");
      return;
    }

    const nameTrim = fullName.trim();
    if (nameTrim.length < 2) {
      toast.error("Please enter your full name.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    const ten =
      phoneDigits.length === 12 && phoneDigits.startsWith("91")
        ? phoneDigits.slice(2)
        : phoneDigits.length === 10
          ? phoneDigits
          : "";
    if (!/^[6-9]\d{9}$/.test(ten)) {
      toast.error("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    const addrTrim = address.trim();
    if (addrTrim.length < 10) {
      toast.error("Please enter a complete address.");
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      toast.error("Pincode must be 6 digits.");
      return;
    }

    setBusy(true);
    try {
      addAddress({
        label: label.trim() || `Address ${profile.addresses.length + 1}`,
        full_name: nameTrim,
        phone: ten,
        address: addrTrim,
        landmark: landmark.trim(),
        pincode: pincode.trim(),
      });

      toast.success("Address saved");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose className="max-h-[min(90vh,560px)]">
        <DialogHeader>
          <DialogTitle>Add new address</DialogTitle>
          <DialogDescription>
            Save another delivery location. It will be selected for checkout
            automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="add-addr-label">Label (e.g. Home, Work)</Label>
            <Input
              id="add-addr-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Work"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-addr-name">Full name *</Label>
            <Input
              id="add-addr-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-addr-phone">Phone *</Label>
            <Input
              id="add-addr-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              autoComplete="tel"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-addr-address">Delivery address *</Label>
            <Textarea
              id="add-addr-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-addr-landmark">Landmark (optional)</Label>
            <Input
              id="add-addr-landmark"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="add-addr-pincode">Pincode *</Label>
            <Input
              id="add-addr-pincode"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) =>
                setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
