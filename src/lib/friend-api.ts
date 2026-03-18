export type FriendUser = {
  id: number;
  username: string | null;
  email: string | null;
  role_id: number | null;
  is_online: boolean;
};

export type PendingIncomingRequest = {
  request_id: number;
  user_id: number;
  friend_id: number;
  trang_thai: string;
  created_at?: string;
  requester: FriendUser;
};

export type PendingOutgoingRequest = {
  request_id: number;
  user_id: number;
  friend_id: number;
  trang_thai: string;
  created_at?: string;
  receiver: FriendUser;
};

type FriendListResponse = {
  user_id: number;
  friends: FriendUser[];
};

type PendingRequestsResponse = {
  user_id: number;
  incoming: PendingIncomingRequest[];
  outgoing: PendingOutgoingRequest[];
};

type FriendSuggestionResponse = {
  user_id: number;
  suggestions: FriendUser[];
};

type FriendActionResponse = {
  message: string;
  data: {
    id: number;
    user_id: number;
    friend_id: number;
    trang_thai: string;
    created_at?: string;
  };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

type Query = Record<string, string | number | undefined | null>;

function makeUrl(path: string, query?: Query) {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && `${value}`.length > 0) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, init?: RequestInit, query?: Query): Promise<T> {
  const response = await fetch(makeUrl(path, query), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.message === "string"
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(", ")
          : "Yêu cầu thất bại";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getFriendList(userId: number) {
  return request<FriendListResponse>("/ket-ban/danh-sach", { method: "GET" }, { user_id: userId });
}

export function getFriendSuggestions(userId: number, limit = 10) {
  return request<FriendSuggestionResponse>("/ket-ban/goi-y", { method: "GET" }, { user_id: userId, limit });
}

export function sendFriendRequest(payload: { user_id: number; friend_id: number }) {
  return request<FriendActionResponse>("/ket-ban/gui-loi-moi", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPendingFriendRequests(userId: number) {
  return request<PendingRequestsResponse>("/ket-ban/loi-moi", { method: "GET" }, { user_id: userId });
}

export function acceptFriendRequestById(payload: { request_id: number; current_user_id: number }) {
  return request<FriendActionResponse>(`/ket-ban/chap-nhan/${payload.request_id}`, {
    method: "POST",
    body: JSON.stringify({
      current_user_id: payload.current_user_id,
    }),
  });
}
