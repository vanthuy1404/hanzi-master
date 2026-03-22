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
  avatar_url: string | null;
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

export type ProfileHistoryItem = {
  id: number;
  created_at: string;
  loai_bai: "luyen_tap_dich" | "sap_xep_cau";
  bai_tap_id: number;
  tong_so_cau: number;
  so_cau_dung: number;
  diem: number;
  level: "de" | "trung_binh" | "kho" | null;
  topic_ids: number[];
};

export type ProfileSummaryResponse = {
  user: AuthUser;
  stats: {
    so_bai_luyen_tap: number;
    tong_diem_kinh_nghiem: number;
  };
  history: ProfileHistoryItem[];
};

export type ChangePasswordResponse = {
  message: string;
};

export type UploadAvatarResponse = {
  message: string;
  user: AuthUser;
};

type ApiErrorResponse = {
  message?: string | string[];
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

const ERROR_MAP: Record<string, string> = {
  "username va password la bat buoc": "Tên đăng nhập và mật khẩu là bắt buộc.",
  "username da ton tai": "Tên đăng nhập đã tồn tại.",
  "thong tin dang nhap khong dung": "Thông tin đăng nhập không đúng.",
  "token khong hop le": "Phiên đăng nhập không hợp lệ.",
  "token het han hoac khong hop le": "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.",
  "thieu Authorization header": "Thiếu thông tin xác thực.",
  "khong tim thay nguoi dung": "Không tìm thấy người dùng.",
  "vui long chon file anh": "Vui lòng chọn ảnh đại diện.",
  "chi ho tro anh jpg, png hoac webp": "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.",
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
  const body = init?.body;

  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(normalizeErrorMessage(body?.message));
  }

  return (await response.json()) as T;
}

export function resolveAssetUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
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

export function getProfileSummary(token: string) {
  return request<ProfileSummaryResponse>("/auth/profile-summary", {
    method: "GET",
    token,
  });
}

export function changePassword(
  token: string,
  payload: {
    old_password: string;
    new_password: string;
  },
) {
  return request<ChangePasswordResponse>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export function uploadAvatar(token: string, file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  return request<UploadAvatarResponse>("/auth/avatar", {
    method: "POST",
    body: formData,
    token,
  });
}
