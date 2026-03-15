"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getMe, type AuthUser } from "@/lib/auth-api";
import { getAuthToken, saveUser } from "@/lib/auth-storage";
import { ThemeToggle } from "@/components/theme-toggle";

type MainLayoutProps = {
  children: ReactNode;
};

const menuItems = [
  { label: "Tổng quan", icon: "dashboard", active: true },
  { label: "Bài học", icon: "school", active: false },
  { label: "Tiến độ", icon: "insights", active: false },
  { label: "Hồ sơ", icon: "person", active: false },
  { label: "Cài đặt", icon: "settings", active: false },
];

function getInitials(username?: string) {
  if (!username) {
    return "U";
  }

  return username.slice(0, 2).toUpperCase();
}

export function MainLayout({ children }: MainLayoutProps) {
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
            <button
              key={item.label}
              type="button"
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-primary/5"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-primary/10 p-4">
          <div className="rounded-xl bg-primary/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
              Cấp độ hiện tại
            </p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">HSK 3</span>
              <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-slate-900">
                Pro
              </span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-primary/20">
              <div className="h-2 w-2/3 rounded-full bg-primary" />
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
              placeholder="Tìm ký tự, từ vựng hoặc ngữ pháp..."
              className="w-full rounded-lg border border-transparent bg-background py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="ml-4 flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              className="relative rounded-lg p-2 text-muted transition hover:bg-primary/5"
            >
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="hidden h-8 w-px bg-primary/10 sm:block" />
            <Link href="/home" className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold">{user?.username ?? "Học viên"}</p>
                <p className="text-[10px] font-medium text-muted">CHUỖI: 12 NGÀY</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/15 text-sm font-bold text-primary">
                {getInitials(user?.username)}
              </div>
            </Link>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
