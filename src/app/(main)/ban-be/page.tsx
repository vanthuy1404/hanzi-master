"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getMe } from "@/lib/auth-api";
import { getAuthToken, getStoredUser, saveUser } from "@/lib/auth-storage";
import {
  acceptFriendRequestById,
  getFriendList,
  getPendingFriendRequests,
  getFriendSuggestions,
  sendFriendRequest,
  type FriendUser,
  type PendingIncomingRequest,
  type PendingOutgoingRequest,
} from "@/lib/friend-api";

type ChatMessage = {
  id: number;
  user_id: number;
  friend_id: number;
  noi_dung: string;
  created_at?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

function roleLabel(roleId: number | null) {
  if (roleId === 1) return "Admin";
  if (roleId === 2) return "Giáo viên";
  return "Học sinh";
}

export default function BanBePage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<PendingIncomingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PendingOutgoingRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const selectedFriend = useMemo(
    () => friends.find((item) => item.id === selectedFriendId) ?? null,
    [friends, selectedFriendId],
  );

  async function loadData(currentUserId: number) {
    setLoading(true);
    setError("");
    try {
      const [friendList, suggestionList, pendingResult] = await Promise.all([
        getFriendList(currentUserId),
        getFriendSuggestions(currentUserId, 10),
        getPendingFriendRequests(currentUserId),
      ]);
      setFriends(friendList.friends);
      setSuggestions(suggestionList.suggestions);
      setIncomingRequests(pendingResult.incoming);
      setOutgoingRequests(pendingResult.outgoing);
      if (!selectedFriendId && friendList.friends.length) {
        setSelectedFriendId(friendList.friends[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải module bạn bè");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const localUser = getStoredUser();
    if (localUser?.id) {
      setUserId(localUser.id);
      loadData(localUser.id).catch(() => {});
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      setError("Bạn cần đăng nhập để sử dụng module bạn bè");
      return;
    }

    getMe(token)
      .then((response) => {
        saveUser(response.user);
        setUserId(response.user.id);
        return loadData(response.user.id);
      })
      .catch(() => {
        setLoading(false);
        setError("Bạn cần đăng nhập để sử dụng module bạn bè");
      });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${API_BASE}/chat`, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register_user", { user_id: userId });
    });

    socket.on("chat_history", (payload: { messages?: ChatMessage[] }) => {
      setMessages(payload?.messages ?? []);
    });

    socket.on("new_message", (message: ChatMessage) => {
      if (!selectedFriendId) return;
      const isCurrentRoom =
        (message.user_id === userId && message.friend_id === selectedFriendId) ||
        (message.user_id === selectedFriendId && message.friend_id === userId);
      if (isCurrentRoom) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("presence_changed", (payload: { user_id: number; is_online: boolean }) => {
      setFriends((prev) =>
        prev.map((item) =>
          item.id === payload.user_id ? { ...item, is_online: payload.is_online } : item,
        ),
      );
      setSuggestions((prev) =>
        prev.map((item) =>
          item.id === payload.user_id ? { ...item, is_online: payload.is_online } : item,
        ),
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, selectedFriendId]);

  useEffect(() => {
    if (!socketRef.current || !userId || !selectedFriendId) return;
    socketRef.current.emit("join_chat", {
      user_id: userId,
      friend_id: selectedFriendId,
    });
  }, [userId, selectedFriendId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!socketRef.current || !userId || !selectedFriendId || !messageInput.trim()) return;

    try {
      setSending(true);
      socketRef.current.emit("send_message", {
        user_id: userId,
        friend_id: selectedFriendId,
        noi_dung: messageInput.trim(),
      });
      setMessageInput("");
    } finally {
      setSending(false);
    }
  }

  async function onAddFriend(friendId: number) {
    if (!userId) return;
    try {
      await sendFriendRequest({
        user_id: userId,
        friend_id: friendId,
      });
      await loadData(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi lời mời kết bạn");
    }
  }

  async function onAcceptRequest(requestId: number) {
    if (!userId) return;
    try {
      await acceptFriendRequestById({
        request_id: requestId,
        current_user_id: userId,
      });
      await loadData(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể chấp nhận lời mời");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 px-6 py-8 md:px-10">
      <section>
        <h1 className="text-3xl font-black tracking-tight">Bạn Bè & Nhắn Tin</h1>
        <p className="mt-1 text-muted">Theo dõi trạng thái hoạt động và chat realtime qua socket.</p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr_320px]">
        <article className="rounded-2xl border border-primary/10 bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">Danh sách bạn bè</h2>
          {loading ? (
            <p className="text-sm text-muted">Đang tải...</p>
          ) : !friends.length ? (
            <p className="text-sm text-muted">Bạn chưa có bạn bè nào.</p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => setSelectedFriendId(friend.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                    selectedFriendId === friend.id
                      ? "border-primary bg-primary/10"
                      : "border-primary/10 hover:bg-primary/5"
                  }`}
                >
                  <span>
                    <strong className="block text-sm">{friend.username ?? `User #${friend.id}`}</strong>
                    <span className="text-xs text-muted">{roleLabel(friend.role_id)}</span>
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      friend.is_online ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-primary/10 bg-surface p-4 shadow-sm">
          <div className="mb-3 border-b border-primary/10 pb-3">
            <h2 className="text-lg font-bold">
              {selectedFriend ? `Chat với ${selectedFriend.username ?? `User #${selectedFriend.id}`}` : "Khung chat"}
            </h2>
            {selectedFriend && (
              <p className="text-xs text-muted">
                {selectedFriend.is_online ? "Đang hoạt động" : "Không hoạt động"}
              </p>
            )}
          </div>

          {!selectedFriend ? (
            <p className="text-sm text-muted">Chọn một người bạn ở cột trái để bắt đầu chat.</p>
          ) : (
            <>
              <div className="h-[420px] space-y-2 overflow-y-auto rounded-lg border border-primary/10 bg-background/70 p-3">
                {messages.map((message) => {
                  const isMine = message.user_id === userId;
                  return (
                    <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${
                          isMine ? "bg-primary text-slate-900" : "bg-surface border border-primary/10"
                        }`}
                      >
                        {message.noi_dung}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={onSendMessage} className="mt-3 flex gap-2">
                <input
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="h-11 flex-1 rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  className="h-11 rounded-lg bg-primary px-4 font-bold text-slate-900 disabled:opacity-60"
                >
                  Gửi
                </button>
              </form>
            </>
          )}
        </article>

        <article className="rounded-2xl border border-primary/10 bg-surface p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">Gợi ý hệ thống</h2>
          {!!incomingRequests.length && (
            <div className="mb-4 space-y-2 rounded-lg border border-primary/10 bg-background/60 p-3">
              <p className="text-sm font-bold">Lời mời kết bạn ({incomingRequests.length})</p>
              {incomingRequests.map((request) => (
                <div key={request.request_id} className="rounded-lg border border-primary/10 bg-surface p-2">
                  <p className="text-sm font-semibold">
                    {request.requester.username ?? `User #${request.requester.id}`}
                  </p>
                  <p className="text-xs text-muted">{roleLabel(request.requester.role_id)}</p>
                  <button
                    type="button"
                    onClick={() => onAcceptRequest(request.request_id)}
                    className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-sm font-bold text-slate-900"
                  >
                    Chấp nhận
                  </button>
                </div>
              ))}
            </div>
          )}

          {!!outgoingRequests.length && (
            <div className="mb-4 rounded-lg border border-primary/10 bg-background/60 p-3">
              <p className="mb-2 text-sm font-bold">Đã gửi ({outgoingRequests.length})</p>
              <div className="space-y-1">
                {outgoingRequests.map((request) => (
                  <p key={request.request_id} className="text-xs text-muted">
                    {request.receiver.username ?? `User #${request.receiver.id}`} - đang chờ
                  </p>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted">Đang tải...</p>
          ) : !suggestions.length ? (
            <p className="text-sm text-muted">Hiện không có gợi ý phù hợp.</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((user) => (
                <div key={user.id} className="rounded-lg border border-primary/10 p-3">
                  <div className="flex items-center justify-between">
                    <span>
                      <strong className="block text-sm">{user.username ?? `User #${user.id}`}</strong>
                      <span className="text-xs text-muted">{roleLabel(user.role_id)}</span>
                    </span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        user.is_online ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddFriend(user.id)}
                    className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-bold text-slate-900"
                  >
                    Kết bạn
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
