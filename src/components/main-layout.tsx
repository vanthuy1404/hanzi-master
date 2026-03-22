"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getMe, getProfileSummary, resolveAssetUrl, type AuthUser } from "@/lib/auth-api";
import { getAuthToken, saveUser } from "@/lib/auth-storage";
import { ThemeToggle } from "@/components/theme-toggle";

type MainLayoutProps = { children: ReactNode };

const menuItems = [
  { label: "Tổng quan", icon: "dashboard", href: "/home" },
  { label: "Chủ đề", icon: "category", href: "/chu-de" },
  { label: "Flash Card", icon: "style", href: "/flash-card" },
  { label: "Sắp xếp câu", icon: "format_list_numbered", href: "/sap-xep-cau" },
  { label: "Ghép từ", icon: "compare_arrows", href: "/ghep-tu/lam-bai" },
  { label: "Bạn bè", icon: "group", href: "/ban-be" },
  { label: "Luyện tập dịch", icon: "translate", href: "/luyen-tap-dich" },
  { label: "Hồ sơ", icon: "person", href: "/ho-so" },
];

function getInitials(username?: string) {
  if (!username) return "U";
  return username.slice(0, 2).toUpperCase();
}

function getHskByExp(exp: number) {
  if (exp >= 3000) return 6;
  if (exp >= 2200) return 5;
  if (exp >= 1500) return 4;
  if (exp >= 900) return 3;
  if (exp >= 400) return 2;
  return 1;
}

function getBadgeByExp(exp: number) {
  if (exp >= 2200) return "Master";
  if (exp >= 900) return "Advanced";
  if (exp >= 400) return "Intermediate";
  return "Starter";
}

function getProgressByExp(exp: number) {
  const ranges = [
    { min: 0, max: 399 },
    { min: 400, max: 899 },
    { min: 900, max: 1499 },
    { min: 1500, max: 2199 },
    { min: 2200, max: 2999 },
    { min: 3000, max: 3800 },
  ];
  const current = ranges.find((item) => exp >= item.min && exp <= item.max) ?? ranges[ranges.length - 1];
  const span = Math.max(1, current.max - current.min + 1);
  return Math.min(100, Math.max(5, Math.round(((exp - current.min + 1) / span) * 100)));
}

export function MainLayout({ children }: MainLayoutProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [exp, setExp] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    Promise.all([getMe(token), getProfileSummary(token)])
      .then(([me, summary]) => {
        setUser(me.user);
        saveUser(me.user);
        setExp(summary.stats.tong_diem_kinh_nghiem ?? 0);
      })
      .catch(() => {});
  }, []);

  const hsk = getHskByExp(exp);
  const badge = getBadgeByExp(exp);
  const progressPercent = getProgressByExp(exp);
  const avatarSrc = resolveAssetUrl(user?.avatar_url);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-primary/10 bg-surface lg:flex">
        <div className="flex items-center gap-3 p-6">
          <div className="rounded-lg bg-primary p-2 text-slate-900">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Hanzi Master</h1>
        </div>

        <nav className="mt-4 flex-1 space-y-2 px-4">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                pathname === item.href ? "bg-primary/10 text-primary" : "text-muted hover:bg-primary/5"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-primary/10 p-4">
          <p className="mb-3 text-xs text-muted">Bản quyền thuộc về Đặng Văn Thùy</p>
          <div className="rounded-xl bg-primary/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Trình độ hiện tại</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">HSK {hsk}</span>
              <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-slate-900">{badge}</span>
            </div>
            <p className="mt-1 text-xs text-muted">EXP: {exp}</p>
            <div className="mt-3 h-2 w-full rounded-full bg-primary/20">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-primary/10 bg-surface px-4 md:px-8">
          <div className="relative max-w-md flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm chủ đề hoặc từ vựng..."
              className="w-full rounded-lg border border-transparent bg-background py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="ml-4 flex items-center gap-3">
            <ThemeToggle />
            <button type="button" className="relative rounded-lg p-2 text-muted transition hover:bg-primary/5">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="hidden h-8 w-px bg-primary/10 sm:block" />
            <Link href="/ho-so" className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold">{user?.username ?? "Học viên"}</p>
                <p className="text-[10px] font-medium text-muted">EXP: {exp}</p>
              </div>
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/15 text-sm font-bold text-primary">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  getInitials(user?.username)
                )}
              </div>
            </Link>
          </div>
        </header>
        <div className="pb-20 lg:pb-0">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-primary/10 bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          {menuItems.map((item) => (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-lg px-1 text-[10px] font-medium transition-colors ${
                pathname === item.href ? "bg-primary/10 text-primary" : "text-muted hover:bg-primary/5"
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
              <span className="mt-0.5 truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
