/**
 * Admin Feedback Dashboard — view WhatsApp messages and request feedback.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

type WaMessage = {
  id: string;
  phone: string;
  message: string;
  message_id: string;
  timestamp: string;
  created_at: string;
};

type DeliveredOrder = {
  order_id: string;
  name: string;
  phone: string;
  total: number;
  created_at: string;
  status: string;
};

const POLL_INTERVAL = 20_000;

export default function FeedbackPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [passInput, setPassInput] = useState("");

  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"messages" | "orders">("messages");
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Custom message modal
  const [showCustom, setShowCustom] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [customName, setCustomName] = useState("");
  const [sendingCustom, setSendingCustom] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("shaka-admin-secret");
    if (saved) {
      setSecret(saved);
      setAuthenticated(true);
    }
  }, []);

  const fetchData = useCallback(async (adminSecret: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feedback?limit=100", {
        headers: { "x-admin-secret": adminSecret },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load");
        return;
      }
      setMessages(data.messages ?? []);
      setDeliveredOrders(data.deliveredOrders ?? []);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void fetchData(secret);
    pollRef.current = setInterval(() => void fetchData(secret), POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authenticated, secret, fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passInput.trim();
    if (!trimmed) return;
    setSecret(trimmed);
    sessionStorage.setItem("shaka-admin-secret", trimmed);
    setAuthenticated(true);
    setPassInput("");
  };

  const askFeedback = async (
    phone: string,
    orderId?: string,
    customerName?: string
  ) => {
    setSendingTo(phone);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ phone, orderId, customerName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send");
        return;
      }
      toast.success(`Feedback request sent to ${phone}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSendingTo(null);
    }
  };

  const sendCustomMessage = async () => {
    if (!customPhone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    setSendingCustom(true);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          phone: customPhone.trim(),
          customerName: customName.trim() || undefined,
          customMessage: customMsg.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send");
        return;
      }
      toast.success("Message sent!");
      setShowCustom(false);
      setCustomPhone("");
      setCustomMsg("");
      setCustomName("");
    } catch {
      toast.error("Network error");
    } finally {
      setSendingCustom(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 rounded-lg border border-gold/30 bg-forest p-6 shadow-xl"
        >
          <Link href="/" className="flex justify-center">
            <Image
              src="/images/LogoSH.png"
              alt="THE SHAKA-HARI"
              width={80}
              height={80}
              className="object-contain"
            />
          </Link>
          <h1 className="text-center font-brand-serif text-xl text-gold">
            Feedback Dashboard
          </h1>
          <div>
            <label
              htmlFor="admin-pass"
              className="mb-1 block text-xs text-gold/70"
            >
              Admin passphrase
            </label>
            <input
              id="admin-pass"
              type="password"
              className="w-full rounded-md border border-gold/30 bg-forest px-3 py-2 text-sm text-gold outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-gold/20 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/30"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forest text-gold">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gold/20 bg-forest/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Image
                src="/images/LogoSH.png"
                alt="THE SHAKA-HARI"
                width={40}
                height={40}
                className="object-contain"
              />
            </Link>
            <h1 className="font-brand-serif text-lg">Feedback</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-md border border-gold/30 px-3 py-1 text-xs transition hover:bg-gold/10"
            >
              Orders
            </Link>
            <Link
              href="/admin/chat"
              className="rounded-md border border-gold/30 px-3 py-1 text-xs transition hover:bg-gold/10"
            >
              Chat
            </Link>
            <button
              type="button"
              onClick={() => void fetchData(secret)}
              className="rounded-md border border-gold/30 px-3 py-1 text-xs transition hover:bg-gold/10"
            >
              {loading ? "Loading\u2026" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("shaka-admin-secret");
                setAuthenticated(false);
                setSecret("");
              }}
              className="rounded-md border border-gold/20 px-3 py-1 text-xs text-gold/60 transition hover:bg-gold/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Tabs */}
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              tab === "messages"
                ? "bg-gold/20 text-gold"
                : "text-gold/50 hover:text-gold"
            }`}
            onClick={() => setTab("messages")}
          >
            WhatsApp Messages ({messages.length})
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              tab === "orders"
                ? "bg-gold/20 text-gold"
                : "text-gold/50 hover:text-gold"
            }`}
            onClick={() => setTab("orders")}
          >
            Delivered Orders ({deliveredOrders.length})
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="rounded-md bg-gold/20 px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/30"
          >
            + Send Message
          </button>
        </div>

        {/* Custom message modal */}
        {showCustom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md space-y-3 rounded-lg border border-gold/30 bg-forest p-5 shadow-2xl">
              <h2 className="font-brand-serif text-lg text-gold">
                Send WhatsApp Message
              </h2>
              <div>
                <label className="mb-1 block text-xs text-gold/70">
                  Phone number
                </label>
                <input
                  type="tel"
                  className="w-full rounded-md border border-gold/30 bg-forest px-3 py-2 text-sm text-gold outline-none focus:border-gold/60"
                  placeholder="e.g. 9876543210"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gold/70">
                  Customer name (optional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gold/30 bg-forest px-3 py-2 text-sm text-gold outline-none focus:border-gold/60"
                  placeholder="e.g. Rahul"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gold/70">
                  Message (leave empty for default feedback request)
                </label>
                <textarea
                  className="w-full rounded-md border border-gold/30 bg-forest px-3 py-2 text-sm text-gold outline-none focus:border-gold/60"
                  rows={4}
                  placeholder="Leave empty for auto-generated feedback request..."
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="rounded-md border border-gold/20 px-4 py-1.5 text-xs text-gold/60 transition hover:bg-gold/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sendingCustom}
                  onClick={() => void sendCustomMessage()}
                  className="rounded-md bg-gold/20 px-4 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/30 disabled:opacity-50"
                >
                  {sendingCustom ? "Sending\u2026" : "Send on WhatsApp"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages tab */}
        {tab === "messages" && (
          <>
            {loading && messages.length === 0 ? (
              <p className="py-12 text-center text-gold/50">
                Loading messages\u2026
              </p>
            ) : messages.length === 0 ? (
              <p className="py-12 text-center text-gold/50">
                No messages yet.
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 rounded-lg border border-gold/15 bg-forest px-4 py-3 transition hover:border-gold/25"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                      {m.phone.slice(-4)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gold/80">
                          +{m.phone}
                        </span>
                        <span className="text-[10px] text-gold/40">
                          {formatDate(m.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-gold/70">
                        {m.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={sendingTo === m.phone}
                      onClick={() => void askFeedback(m.phone)}
                      className="shrink-0 rounded-md border border-gold/20 px-2.5 py-1 text-[11px] text-gold/50 transition hover:bg-gold/10 hover:text-gold disabled:opacity-50"
                    >
                      {sendingTo === m.phone ? "Sending\u2026" : "Ask Feedback"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Delivered orders tab */}
        {tab === "orders" && (
          <>
            {deliveredOrders.length === 0 ? (
              <p className="py-12 text-center text-gold/50">
                No delivered orders yet.
              </p>
            ) : (
              <div className="space-y-2">
                {deliveredOrders.map((o) => (
                  <div
                    key={o.order_id}
                    className="flex items-center gap-3 rounded-lg border border-gold/15 bg-forest px-4 py-3 transition hover:border-gold/25"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {o.order_id}
                        </span>
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-300">
                          Delivered
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gold/60">
                        {o.name} \u00B7 {o.phone} \u00B7 \u20B9{o.total} \u00B7{" "}
                        {formatDate(o.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={sendingTo === o.phone}
                      onClick={() =>
                        void askFeedback(o.phone, o.order_id, o.name)
                      }
                      className="shrink-0 rounded-md bg-gold/15 px-3 py-1.5 text-[11px] font-medium text-gold transition hover:bg-gold/25 disabled:opacity-50"
                    >
                      {sendingTo === o.phone
                        ? "Sending\u2026"
                        : "Request Feedback"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
