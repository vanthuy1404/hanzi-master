export type RegisterPayload = {
  username: string;
  email?: string;
  password: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type AuthUser = {
  id: number;
  username: string;
  email: string | null;
  role_id: number | null;
  created_at?: string;
};

export type RegisterResponse = {
  message: string;
  user: AuthUser;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
};

type ApiErrorResponse = {
  message?: string | string[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

const ERROR_MAP: Record<string, string> = {
  "username va password la bat buoc": "Tên đăng nhập và mật khẩu là bắt buộc.",
  "username da ton tai": "Tên đăng nhập đã tồn tại.",
  "thong tin dang nhap khong dung": "Thông tin đăng nhập không đúng.",
  "token khong hop le": "Phiên đăng nhập không hợp lệ.",
  "token het han hoac khong hop le": "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.",
  "thieu Authorization header": "Thiếu thông tin xác thực.",
  "khong tim thay nguoi dung": "Không tìm thấy người dùng.",
};

function normalizeErrorMessage(message: ApiErrorResponse["message"]) {
  const normalized = Array.isArray(message)
    ? message.join(", ")
    : typeof message === "string"
      ? message
      : "";

  const trimmed = normalized.trim();
  if (!trimmed) {
    return "Có lỗi xảy ra, vui lòng thử lại.";
  }

  return ERROR_MAP[trimmed] ?? trimmed;
}

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const token = init?.token;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | ApiErrorResponse
      | null;
    throw new Error(normalizeErrorMessage(body?.message));
  }

  return (await response.json()) as T;
}

export function register(payload: RegisterPayload) {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginPayload) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(token: string) {
  return request<MeResponse>("/auth/me", {
    method: "GET",
    token,
  });
}
