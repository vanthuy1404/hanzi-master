"use client";

import Link from "next/link";
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
    href: "/flash-card",
  },
  {
    title: "Ghép từ",
    description: "Nối Hán tự với nghĩa tiếng Việt tương ứng.",
    tag: "2 CỘT",
    icon: "compare_arrows",
    color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
    href: "/chu-de",
  },
  {
    title: "Điền nghĩa",
    description: "Dịch Hán tự thành nghĩa tiếng Việt chính xác.",
    tag: "VIẾT TAY",
    icon: "translate",
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
    href: "/chu-de",
  },
  {
    title: "Luyện tập dịch",
    description: "Làm bài dịch Việt → pinyin, nộp bài và nhận điểm ngay.",
    tag: "MỚI",
    icon: "quiz",
    color: "text-amber-700 bg-amber-100 dark:bg-amber-900/30",
    href: "/luyen-tap-dich/lam-bai",
  },
];

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
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
          <h2 className="text-3xl font-black tracking-tight">Chào mừng quay lại, {user?.username ?? "học viên"}!</h2>
          <p className="mt-1 text-muted">Hôm nay bạn muốn luyện chế độ nào?</p>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold">Chế độ học</h3>
          <Link href="/luyen-tap-dich/lam-bai" className="text-sm font-bold text-primary hover:underline">
            Làm bài luyện tập dịch
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {learningModes.map((mode) => (
            <Link
              key={mode.title}
              href={mode.href}
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
                <span className="rounded bg-background px-2 py-1 text-xs font-bold">{mode.tag}</span>
                <span className="material-symbols-outlined text-primary transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
