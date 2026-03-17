import { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type AuthShellProps = { children: ReactNode };

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-primary/15 px-6 py-4 md:px-20">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-slate-900">
              HM
            </div>
            <h2 className="text-xl font-bold tracking-tight">Hanzi Master</h2>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">{children}</main>

      <footer className="p-6 text-center text-sm text-muted">
        <p>© 2026 Hanzi Master. Mọi quyền được bảo lưu. Bản quyền thuộc về Đặng Văn Thùy.</p>
      </footer>
    </div>
  );
}
