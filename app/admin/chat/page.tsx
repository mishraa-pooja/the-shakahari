/**
 * Admin Chat — two-way WhatsApp messaging with customers.
 * Left panel: conversation list. Right panel: chat thread + compose.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

type Conversation = {
  phone: string;
  lastMessage: string;
  lastDirection: string;
  lastAt: string;
  unread: number;
  customerName: string | null;
};

type ChatMessage = {
  id: string;
  phone: string;
  direction: "inbound" | "outbound";
  message: string;
  admin_name: string;
  created_at: string;
};

const POLL_MS = 8_000;

export default function AdminChatPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [passInput, setPassInput] = useState("");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [compose, setCompose] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(false);

  // New chat modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("shaka-admin-secret");
    if (saved) {
      setSecret(saved);
      setAuthenticated(true);
    }
  }, []);

  const headers = useCallback(
    () => ({ "x-admin-secret": secret }),
    [secret]
  );

  // ── Fetch conversations ────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chat", { headers: headers() });
      const data = await res.json();
      if (res.ok) setConversations(data.conversations ?? []);
    } catch { /* silent */ }
  }, [headers]);

  // ── Fetch messages for active phone ────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!activePhone) return;
    try {
      const res = await fetch(
        `/api/admin/chat?phone=${encodeURIComponent(activePhone)}`,
        { headers: headers() }
      );
      const data = await res.json();
      if (res.ok) {
        setChatMessages(data.messages ?? []);
        setCustomerName(data.customerName ?? null);
      }
    } catch { /* silent */ }
  }, [activePhone, headers]);

  // Poll both
  useEffect(() => {
    if (!authenticated) return;
    setLoadingConvos(true);
    void fetchConversations().finally(() => setLoadingConvos(false));

    pollRef.current = setInterval(() => {
      void fetchConversations();
      void fetchMessages();
    }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authenticated, fetchConversations, fetchMessages]);

  // When active phone changes, fetch messages
  useEffect(() => {
    if (activePhone) void fetchMessages();
  }, [activePhone, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Send message ───────────────────────────────────────────────
  const sendMessage = async () => {
    if (!activePhone || !compose.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ phone: activePhone, message: compose.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send");
        return;
      }
      setCompose("");
      void fetchMessages();
      void fetchConversations();
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  // ── Start new chat ────────────────────────────────────────────
  const startNewChat = () => {
    const digits = newPhone.replace(/\D/g, "");
    const phone = digits.startsWith("91") ? digits : `91${digits}`;
    if (phone.length < 12) {
      toast.error("Enter a valid phone number");
      return;
    }
    setActivePhone(phone);
    setShowNewChat(false);
    setNewPhone("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passInput.trim();
    if (!trimmed) return;
    setSecret(trimmed);
    sessionStorage.setItem("shaka-admin-secret", trimmed);
    setAuthenticated(true);
    setPassInput("");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeShort = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) {
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // ── Login screen ──────────────────────────────────────────────
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
            Admin Chat
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

  // ── Main chat UI ──────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-forest text-gold">
      {/* Header */}
      <header className="shrink-0 border-b border-gold/20 bg-forest/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Image
                src="/images/LogoSH.png"
                alt="THE SHAKA-HARI"
                width={36}
                height={36}
                className="object-contain"
              />
            </Link>
            <h1 className="font-brand-serif text-lg">Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="rounded-md border border-gold/30 px-3 py-1 text-xs transition hover:bg-gold/10"
            >
              Orders
            </Link>
            <Link
              href="/admin/feedback"
              className="rounded-md border border-gold/30 px-3 py-1 text-xs transition hover:bg-gold/10"
            >
              Feedback
            </Link>
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

      {/* Body: sidebar + chat */}
      <div className="flex min-h-0 flex-1">
        {/* ── Conversation list (left) ──────────────────────────── */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-gold/15 sm:w-80">
          <div className="flex items-center justify-between border-b border-gold/10 px-3 py-2">
            <span className="text-xs font-medium text-gold/50 uppercase tracking-wider">
              Conversations
            </span>
            <button
              type="button"
              onClick={() => setShowNewChat(true)}
              className="rounded-md bg-gold/15 px-2.5 py-1 text-[11px] font-medium text-gold transition hover:bg-gold/25"
            >
              + New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvos && conversations.length === 0 ? (
              <p className="py-8 text-center text-xs text-gold/40">
                Loading&hellip;
              </p>
            ) : conversations.length === 0 ? (
              <p className="py-8 text-center text-xs text-gold/40">
                No conversations yet.
                <br />
                Messages will appear here when customers text on WhatsApp.
              </p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => setActivePhone(c.phone)}
                  className={`flex w-full items-start gap-3 border-b border-gold/8 px-3 py-3 text-left transition hover:bg-gold/5 ${
                    activePhone === c.phone ? "bg-gold/10" : ""
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                    {c.phone.slice(-4)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-medium">
                        {c.customerName ?? `+${c.phone}`}
                      </span>
                      <span className="shrink-0 text-[10px] text-gold/40">
                        {formatTimeShort(c.lastAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gold/50">
                      {c.lastDirection === "outbound" ? "You: " : ""}
                      {c.lastMessage.slice(0, 60)}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="mt-1 flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[#25D366] text-[10px] font-bold text-forest">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── Chat window (right) ──────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col">
          {!activePhone ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-gold/40">Select a conversation</p>
                <p className="mt-1 text-xs text-gold/30">
                  or click &ldquo;+ New Chat&rdquo; to message a customer
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-gold/15 px-4 py-2.5">
                {/* Back button for mobile */}
                <button
                  type="button"
                  onClick={() => setActivePhone(null)}
                  className="rounded-md border border-gold/20 px-2 py-1 text-xs text-gold/60 sm:hidden"
                >
                  &larr;
                </button>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-xs font-bold">
                  {activePhone.slice(-4)}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {customerName ?? `+${activePhone}`}
                  </p>
                  <p className="text-[10px] text-gold/40">+{activePhone}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {chatMessages.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gold/30">
                    No messages yet. Type below to start the conversation.
                  </p>
                ) : (
                  chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${
                        m.direction === "outbound"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-xl px-3.5 py-2 ${
                          m.direction === "outbound"
                            ? "bg-[#25D366]/20 text-gold"
                            : "bg-gold/10 text-gold/90"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {m.message}
                        </p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            m.direction === "outbound"
                              ? "text-[#25D366]/60"
                              : "text-gold/30"
                          }`}
                        >
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Compose */}
              <div className="border-t border-gold/15 px-4 py-3">
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 resize-none rounded-lg border border-gold/25 bg-forest px-3 py-2 text-sm text-gold outline-none placeholder:text-gold/30 focus:border-gold/50"
                    rows={2}
                    placeholder="Type a message..."
                    value={compose}
                    onChange={(e) => setCompose(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={sending || !compose.trim()}
                    onClick={() => void sendMessage()}
                    className="self-end rounded-lg bg-[#25D366]/20 px-4 py-2 text-sm font-bold text-[#25D366] transition hover:bg-[#25D366]/30 disabled:opacity-40"
                  >
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-gold/30 bg-forest p-5 shadow-2xl">
            <h2 className="font-brand-serif text-lg text-gold">
              New Conversation
            </h2>
            <div>
              <label className="mb-1 block text-xs text-gold/70">
                Customer phone number
              </label>
              <input
                type="tel"
                className="w-full rounded-md border border-gold/30 bg-forest px-3 py-2 text-sm text-gold outline-none focus:border-gold/60"
                placeholder="e.g. 9876543210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startNewChat()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowNewChat(false);
                  setNewPhone("");
                }}
                className="rounded-md border border-gold/20 px-4 py-1.5 text-xs text-gold/60 transition hover:bg-gold/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-md bg-gold/20 px-4 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/30"
              >
                Open Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
