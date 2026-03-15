"use client";

import { useEffect, useState } from "react";
import { getMe, type AuthUser } from "@/lib/auth-api";
import { getAuthToken, saveUser } from "@/lib/auth-storage";

const learningModes = [
  {
    title: "Flashcards",
    description: "Ghi nhớ Hán tự, pinyin và nghĩa bằng cách lặp lại có chủ đích.",
    tag: "20 THẺ",
    icon: "style",
    color: "text-primary bg-primary/10",
  },
  {
    title: "Ghép từ",
    description: "Nối Hán tự với nghĩa tiếng Việt tương ứng.",
    tag: "2 CỘT",
    icon: "compare_arrows",
    color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
  },
  {
    title: "Điền nghĩa",
    description: "Dịch Hán tự thành nghĩa tiếng Việt chính xác.",
    tag: "VIẾT TAY",
    icon: "translate",
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    title: "Luyện pinyin",
    description: "Nhận diện và gõ đúng pinyin cùng thanh điệu.",
    tag: "TRỌNG ÂM",
    icon: "language",
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  },
  {
    title: "Trắc nghiệm",
    description: "Chọn đáp án đúng từ các lựa chọn cho sẵn.",
    tag: "QUIZ",
    icon: "checklist",
    color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30",
  },
  {
    title: "Chọn Hán tự đúng",
    description: "Chọn đúng chữ Hán theo pinyin hoặc nghĩa đã cho.",
    tag: "NHẬN DIỆN",
    icon: "format_shapes",
    color: "text-violet-600 bg-violet-100 dark:bg-violet-900/30",
  },
];

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      return;
    }

    getMe(token)
      .then((response) => {
        setUser(response.user);
        saveUser(response.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 p-4 md:p-8">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight">
            Chào mừng quay lại, {user?.username ?? "học viên"}! 👋
          </h2>
          <p className="mt-1 text-muted">
            Bạn chỉ còn 32 từ nữa là hoàn thành từ vựng HSK 3.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-[160px] items-center gap-4 rounded-xl border border-primary/10 bg-surface p-4 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30">
              <span className="material-symbols-outlined">local_fire_department</span>
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs font-medium uppercase text-muted">Ngày liên tục</p>
            </div>
          </div>

          <div className="flex min-w-[160px] items-center gap-4 rounded-xl border border-primary/10 bg-surface p-4 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined">star</span>
            </div>
            <div>
              <p className="text-2xl font-bold">450</p>
              <p className="text-xs font-medium uppercase text-muted">Từ đã học</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold">Chế độ học</h3>
          <button type="button" className="text-sm font-bold text-primary hover:underline">
            Xem tất cả hoạt động
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {learningModes.map((mode) => (
            <button
              key={mode.title}
              type="button"
              className="group flex flex-col rounded-2xl border border-primary/10 bg-surface p-6 text-left shadow-sm transition hover:border-primary"
            >
              <div
                className={`mb-4 flex size-12 items-center justify-center rounded-xl ${mode.color} transition-transform group-hover:scale-110`}
              >
                <span className="material-symbols-outlined">{mode.icon}</span>
              </div>
              <h4 className="mb-1 text-lg font-bold">{mode.title}</h4>
              <p className="mb-4 text-sm text-muted">{mode.description}</p>
              <div className="mt-auto flex items-center justify-between">
                <span className="rounded bg-background px-2 py-1 text-xs font-bold">
                  {mode.tag}
                </span>
                <span className="material-symbols-outlined text-primary transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </div>
            </button>
          ))}

          <button
            type="button"
            className="group flex flex-col rounded-2xl border border-primary/10 bg-surface p-6 text-left shadow-sm transition hover:border-primary md:col-span-2 xl:col-span-3"
          >
            <div className="flex items-start gap-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                <span className="material-symbols-outlined">reorder</span>
              </div>
              <div className="flex-1">
                <h4 className="mb-1 text-lg font-bold">Sắp xếp câu (Nâng cao)</h4>
                <p className="mb-4 text-sm text-muted">
                  Kéo thả từ để tạo thành câu tiếng Trung đúng ngữ pháp.
                </p>
                <div className="flex gap-2">
                  <span className="rounded border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium">
                    HSK 3+
                  </span>
                  <span className="rounded border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium">
                    Tương tác
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-blue-600 transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </div>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white lg:col-span-2">
          <div className="relative z-10">
            <h4 className="mb-2 text-xl font-bold">Tiến độ học tập</h4>
            <p className="mb-6 max-w-sm text-sm text-slate-400">
              Bạn đã đạt 85% mục tiêu tuần này. Tiếp tục phát huy nhé!
            </p>
            <div className="flex h-32 items-end gap-2">
              {[
                { day: "T2", height: "h-1/2" },
                { day: "T3", height: "h-2/3" },
                { day: "T4", height: "h-full" },
                { day: "T5", height: "h-1/3" },
                { day: "T6", height: "h-4/5", active: true },
                { day: "T7", empty: true },
                { day: "CN", empty: true },
              ].map((item) => (
                <div key={item.day} className="relative flex-1">
                  <div className="flex h-28 items-end rounded-t-lg bg-primary/20">
                    {!item.empty && (
                      <div className={`w-full rounded-t-lg bg-primary ${item.height}`} />
                    )}
                  </div>
                  <span
                    className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold ${
                      item.active ? "text-primary" : "text-slate-500"
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <span className="material-symbols-outlined absolute right-8 top-6 text-[120px] opacity-10">
            show_chart
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-3xl bg-primary p-8 text-slate-900">
          <div>
            <h4 className="mb-2 text-xl font-bold">Thử thách hôm nay</h4>
            <p className="mb-4 text-sm font-medium opacity-80">
              Hoàn thành 3 bài Sắp xếp câu để nhận 50 ngọc.
            </p>
          </div>
          <button
            type="button"
            className="w-full rounded-xl bg-white py-3 text-sm font-bold text-slate-900 shadow-lg shadow-black/5 transition-colors hover:bg-slate-50"
          >
            Bắt đầu thử thách
          </button>
        </div>
      </section>
    </div>
  );
}
