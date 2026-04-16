/**
 * Admin dashboard — view and manage orders.
 * Protected by a simple passphrase entered in the browser.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  order_id: string;
  name: string;
  phone: string;
  address: string;
  landmark: string | null;
  pincode: string;
  slot: string;
  notes: string | null;
  items: OrderItem[];
  total: number;
  payment_method: string;
  status: string;
  is_first_order: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

const STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500/20 text-yellow-300" },
  { value: "confirmed", label: "Confirmed", color: "bg-blue-500/20 text-blue-300" },
  { value: "preparing", label: "Preparing", color: "bg-purple-500/20 text-purple-300" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-orange-500/20 text-orange-300" },
  { value: "delivered", label: "Delivered", color: "bg-green-500/20 text-green-300" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500/20 text-red-300" },
] as const;

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

const POLL_INTERVAL = 15_000;

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [passInput, setPassInput] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-item stock management
  const [stockItems, setStockItems] = useState<Record<string, number>>({});
  const [stockTotal, setStockTotal] = useState<number | null>(null);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [stockUpdating, setStockUpdating] = useState<string | null>(null);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem("shaka-admin-secret");
    if (saved) {
      setSecret(saved);
      setAuthenticated(true);
    }
  }, []);

  const fetchStock = useCallback(async (adminSecret: string) => {
    try {
      const res = await fetch("/api/admin/stock", {
        headers: { "x-admin-secret": adminSecret },
      });
      const data = await res.json();
      if (res.ok) {
        const items = data.items ?? {};
        setStockItems(items);
        setStockTotal(data.total ?? 0);
        setWaitlistCount(data.waitlistCount ?? 0);
        setStockInputs((prev) => {
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(items))
            next[k] = prev[k] !== undefined ? prev[k] : String(v);
          return next;
        });
      }
    } catch { /* non-critical */ }
  }, []);

  const fetchOrders = useCallback(
    async (adminSecret: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterStatus) params.set("status", filterStatus);
        params.set("limit", "100");

        const res = await fetch(`/api/admin/orders?${params}`, {
          headers: { "x-admin-secret": adminSecret },
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Failed to load orders");
          return;
        }
        setOrders(data.orders ?? []);
        setTotal(data.total ?? 0);
      } catch {
        toast.error("Network error loading orders");
      } finally {
        setLoading(false);
      }
    },
    [filterStatus]
  );

  useEffect(() => {
    if (!authenticated) return;
    void fetchOrders(secret);
    void fetchStock(secret);
    pollRef.current = setInterval(() => {
      void fetchOrders(secret);
      void fetchStock(secret);
    }, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authenticated, secret, fetchOrders, fetchStock]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passInput.trim();
    if (!trimmed) return;
    setSecret(trimmed);
    sessionStorage.setItem("shaka-admin-secret", trimmed);
    setAuthenticated(true);
    setPassInput("");
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update");
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
            : o
        )
      );
      toast.success(`Order ${orderId} → ${STATUS_MAP[newStatus]?.label ?? newStatus}`);
    } catch {
      toast.error("Network error");
    }
  };

  const ITEM_LABELS: Record<string, string> = {
    "paneer-biryani": "Paneer",
    "veg-dum-biryani": "Signature Veg",
    "soya-chaap-biryani": "Soya Chaap",
    "mushroom-biryani": "Mushroom",
  };

  const updateItemStock = async (itemId: string, val: number) => {
    if (val < 0) return;
    setStockUpdating(itemId);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ itemId, stock: val }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update");
        return;
      }
      const newItems = data.items ?? {};
      setStockItems(newItems);
      setStockTotal(data.total ?? 0);
      // Sync input fields with server values
      const inputs: Record<string, string> = {};
      for (const [k, v] of Object.entries(newItems)) inputs[k] = String(v);
      setStockInputs(inputs);
      if (data.notified > 0) {
        toast.success(`Notified ${data.notified} people on WhatsApp!`);
        setWaitlistCount(0);
      }
      toast.success(`${ITEM_LABELS[itemId] ?? itemId}: ${val}`);
    } catch (err) {
      console.error("stock update error:", err);
      toast.error("Network error");
    } finally {
      setStockUpdating(null);
    }
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
            Admin Dashboard
          </h1>
          <div>
            <label htmlFor="admin-pass" className="mb-1 block text-xs text-gold/70">
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-forest text-gold">
      <header className="sticky top-0 z-30 border-b border-gold/20 bg-forest/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image
                src="/images/LogoSH.png"
                alt="THE SHAKA-HARI"
                width={40}
                height={40}
                className="object-contain"
              />
            </Link>
            <h1 className="font-brand-serif text-lg">Orders</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/feedback"
              className="rounded-md border border-gold/30 px-3 py-1 text-xs transition hover:bg-gold/10"
            >
              Feedback
            </Link>
            <Link
              href="/admin/chat"
              className="rounded-md border border-gold/30 px-3 py-1 text-xs transition hover:bg-gold/10"
            >
              Chat
            </Link>
            <span className="text-xs text-gold/50">{total} total</span>
            <button
              type="button"
              onClick={() => void fetchOrders(secret)}
              className="rounded-md border border-gold/30 px-3 py-1 text-xs transition hover:bg-gold/10"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("shaka-admin-secret");
                setAuthenticated(false);
                setSecret("");
                setOrders([]);
              }}
              className="rounded-md border border-gold/20 px-3 py-1 text-xs text-gold/60 transition hover:bg-gold/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Per-item Stock Control */}
        <div className="mb-5 rounded-lg border border-gold/25 bg-forest p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-gold/50">
                Total Boxes
              </span>
              <span
                className={`text-2xl font-bold ${
                  stockTotal === 0
                    ? "text-red-400"
                    : (stockTotal ?? 0) <= 5
                      ? "text-orange-400"
                      : "text-gold"
                }`}
              >
                {stockTotal ?? "–"}
              </span>
              {stockTotal === 0 && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300">
                  SOLD OUT
                </span>
              )}
            </div>
            {waitlistCount > 0 && (
              <span className="text-xs text-gold/50">
                {waitlistCount} on waitlist
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(ITEM_LABELS).map(([itemId, label]) => {
              const count = stockItems[itemId] ?? 0;
              const isUpdating = stockUpdating === itemId;
              const inputVal = stockInputs[itemId] ?? String(count);
              return (
                <div
                  key={itemId}
                  className="rounded-md border border-gold/15 bg-forest-dark/40 p-3"
                >
                  <p className="mb-2 text-[11px] font-medium text-gold/60">
                    {label}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isUpdating || count <= 0}
                      onClick={() =>
                        void updateItemStock(itemId, Math.max(0, count - 1))
                      }
                      className="rounded border border-gold/20 px-2 py-1 text-sm text-gold/60 transition hover:bg-gold/10 disabled:opacity-30"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      className={`w-14 rounded border border-gold/25 bg-forest px-1 py-1 text-center text-base font-bold outline-none focus:border-gold/60 ${
                        count === 0 ? "text-red-400" : "text-gold"
                      }`}
                      value={isUpdating ? "…" : inputVal}
                      onChange={(e) =>
                        setStockInputs((prev) => ({
                          ...prev,
                          [itemId]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = parseInt(inputVal, 10);
                          if (!isNaN(v) && v >= 0)
                            void updateItemStock(itemId, v);
                        }
                      }}
                      onBlur={() => {
                        const v = parseInt(inputVal, 10);
                        if (!isNaN(v) && v >= 0 && v !== count)
                          void updateItemStock(itemId, v);
                      }}
                      disabled={isUpdating}
                    />
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => void updateItemStock(itemId, count + 1)}
                      className="rounded border border-gold/20 px-2 py-1 text-sm text-gold/60 transition hover:bg-gold/10 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs transition ${
              !filterStatus ? "bg-gold/20 text-gold" : "text-gold/50 hover:text-gold"
            }`}
            onClick={() => setFilterStatus("")}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`rounded-full px-3 py-1 text-xs transition ${
                filterStatus === s.value
                  ? s.color
                  : "text-gold/50 hover:text-gold"
              }`}
              onClick={() =>
                setFilterStatus((prev) => (prev === s.value ? "" : s.value))
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading && orders.length === 0 ? (
          <p className="py-12 text-center text-gold/50">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="py-12 text-center text-gold/50">No orders found.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] ?? {
                label: order.status,
                color: "bg-gray-500/20 text-gray-300",
              };
              const expanded = expandedId === order.order_id;

              return (
                <div
                  key={order.id}
                  className="rounded-lg border border-gold/20 bg-forest transition hover:border-gold/30"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    onClick={() =>
                      setExpandedId((prev) =>
                        prev === order.order_id ? null : order.order_id
                      )
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tracking-wide">
                          {order.order_id}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                        {order.is_first_order && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-medium text-gold">
                            🎁 First
                          </span>
                        )}
                        <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] text-gold/50">
                          {order.source}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gold/60">
                        {order.name} · {order.phone} ·{" "}
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      ₹{order.total}
                    </span>
                    <svg
                      className={`h-4 w-4 shrink-0 text-gold/40 transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {expanded && (
                    <div className="border-t border-gold/10 px-4 py-3 text-xs">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 font-medium text-gold/80">
                            Delivery
                          </p>
                          <p className="text-gold/60">
                            {order.address}
                            {order.landmark ? `, ${order.landmark}` : ""} —{" "}
                            {order.pincode}
                          </p>
                          <p className="mt-1 text-gold/60">
                            Slot: {order.slot}
                          </p>
                          {order.notes && (
                            <p className="mt-1 text-gold/50">
                              Notes: {order.notes}
                            </p>
                          )}
                          <p className="mt-1 text-gold/50">
                            Payment: {order.payment_method}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 font-medium text-gold/80">Items</p>
                          <ul className="space-y-0.5 text-gold/60">
                            {(order.items as OrderItem[]).map((item, idx) => (
                              <li key={idx}>
                                {item.quantity}× {item.name} — ₹
                                {item.price * item.quantity}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1 font-medium text-gold/80">
                            Total: ₹{order.total}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-gold/10 pt-3">
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gold/50">
                          Update Status
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUSES.map((s) => (
                            <button
                              key={s.value}
                              type="button"
                              disabled={order.status === s.value}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                                order.status === s.value
                                  ? `${s.color} opacity-100`
                                  : "border border-gold/20 text-gold/50 hover:bg-gold/10 hover:text-gold"
                              }`}
                              onClick={() =>
                                void updateStatus(order.order_id, s.value)
                              }
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
