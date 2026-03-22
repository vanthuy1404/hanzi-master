"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  changePassword,
  getProfileSummary,
  resolveAssetUrl,
  uploadAvatar,
  type ProfileSummaryResponse,
} from "@/lib/auth-api";
import { getAuthToken, saveUser } from "@/lib/auth-storage";
import { getTopics, type Topic } from "@/lib/topic-api";

const LEVEL_LABEL: Record<string, string> = {
  de: "Dễ",
  trung_binh: "Trung bình",
  kho: "Khó",
};

const ROLE_LABEL: Record<number, string> = {
  1: "Admin",
  2: "Giáo viên",
  3: "Học sinh",
};

function getInitials(username?: string) {
  if (!username) return "U";
  return username.slice(0, 2).toUpperCase();
}

export default function HoSoPage() {
  const [profileData, setProfileData] = useState<ProfileSummaryResponse | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError("Bạn cần đăng nhập để xem hồ sơ.");
      setLoading(false);
      return;
    }

    getProfileSummary(token)
      .then(async (summary) => {
        setProfileData(summary);
        const topicList = await getTopics(summary.user.id);
        setTopics(topicList);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không thể tải hồ sơ"))
      .finally(() => setLoading(false));
  }, []);

  const topicNameMap = useMemo(() => {
    const map = new Map<number, string>();
    topics.forEach((item) => {
      map.set(item.id, item.ten_chu_de ?? `Chủ đề #${item.id}`);
    });
    return map;
  }, [topics]);

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      const response = await changePassword(token, {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setMessage(response.message);
      window.location.href = window.location.pathname;
      setOldPassword("");
      setNewPassword("");
      setShowPasswordModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đổi mật khẩu");
    } finally {
      setSubmitting(false);
    }
  }

  async function onAvatarSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const token = getAuthToken();
    if (!token) {
      setError("Phiên đăng nhập không hợp lệ.");
      return;
    }

    try {
      setUploadingAvatar(true);
      setError("");
      setMessage("");
      const response = await uploadAvatar(token, file);
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              user: response.user,
            }
          : prev,
      );
      saveUser(response.user);
      setMessage(response.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10">
        <div className="rounded-2xl border border-primary/10 bg-surface p-8 text-sm text-muted">Đang tải hồ sơ...</div>
      </main>
    );
  }

  const avatarSrc = resolveAssetUrl(profileData?.user.avatar_url);

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-6 py-8 md:px-10">
      <section>
        <h1 className="text-3xl font-black tracking-tight">Hồ sơ người dùng</h1>
        <p className="mt-1 text-muted">Thông tin cá nhân, lịch sử học và thống kê điểm.</p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {profileData && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Người dùng</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 text-lg font-bold text-primary">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar người dùng" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(profileData.user.username)
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold">{profileData.user.username}</p>
                  <p className="text-sm text-muted">{profileData.user.email ?? "Chưa cập nhật email"}</p>
                  <p className="mt-1 text-sm text-muted">Vai trò: {ROLE_LABEL[profileData.user.role_id ?? 3] ?? "Học sinh"}</p>
                </div>
              </div>
              <div className="mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onAvatarSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="h-10 rounded-lg border border-primary/25 px-4 text-sm font-bold hover:bg-primary/5 disabled:opacity-60"
                >
                  {uploadingAvatar ? "Đang tải ảnh..." : "Đổi ảnh đại diện"}
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tổng số bài đã làm</p>
              <p className="mt-2 text-3xl font-black text-primary">{profileData.stats.so_bai_luyen_tap}</p>
            </article>

            <article className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tổng EXP</p>
              <p className="mt-2 text-3xl font-black text-primary">{profileData.stats.tong_diem_kinh_nghiem}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Bảo mật</h2>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="h-11 rounded-lg bg-primary px-4 font-bold text-slate-900"
            >
              Đổi mật khẩu
            </button>
          </section>

          <section className="rounded-2xl border border-primary/10 bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Lịch sử học</h2>
            {!profileData.history.length ? (
              <p className="text-sm text-muted">Chưa có lịch sử học.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-primary/5 text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Bài luyện tập</th>
                      <th className="px-4 py-3">Loại bài</th>
                      <th className="px-4 py-3">Mức độ</th>
                      <th className="px-4 py-3">Chủ đề</th>
                      <th className="px-4 py-3">Kết quả</th>
                      <th className="px-4 py-3">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10">
                    {profileData.history.map((item) => (
                      <tr key={item.id} className="hover:bg-primary/5">
                        <td className="px-4 py-3 text-sm text-muted">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3">#{item.bai_tap_id}</td>
                        <td className="px-4 py-3">
                          {item.loai_bai === "luyen_tap_dich" ? "Luyện tập dịch" : "Sắp xếp câu"}
                        </td>
                        <td className="px-4 py-3">{item.level ? (LEVEL_LABEL[item.level] ?? item.level) : "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted">
                          {item.topic_ids.map((topicId) => topicNameMap.get(topicId) ?? `#${topicId}`).join(", ")}
                        </td>
                        <td className="px-4 py-3">
                          {item.so_cau_dung}/{item.tong_so_cau}
                        </td>
                        <td className="px-4 py-3 font-bold text-primary">{item.diem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={onChangePassword}
            className="w-full max-w-lg rounded-2xl border border-primary/10 bg-surface p-6 shadow-2xl"
          >
            <h3 className="mb-4 text-xl font-bold">Đổi mật khẩu</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                placeholder="Mật khẩu cũ"
                className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mật khẩu mới"
                className="h-11 w-full rounded-lg border border-primary/20 bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-60"
              >
                {submitting ? "Đang đổi..." : "Xác nhận đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
