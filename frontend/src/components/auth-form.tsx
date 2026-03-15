"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login, register } from "@/lib/auth-api";
import { saveAuthSession } from "@/lib/auth-storage";

type Mode = "login" | "register";

const usernamePattern = /^[A-Za-z0-9._-]{8,20}$/;

type AuthFormProps = {
  mode: Mode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === "login";
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password.trim()) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    if (!isLogin) {
      if (!usernamePattern.test(trimmedUsername)) {
        setError(
          "Tên tài khoản phải dài 8-20 ký tự, không chứa khoảng trắng, không dấu tiếng Việt. Chỉ dùng chữ cái không dấu, số, dấu chấm (.), gạch dưới (_) hoặc gạch ngang (-).",
        );
        return;
      }

      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp.");
        return;
      }
    }

    try {
      setSubmitting(true);

      if (isLogin) {
        const response = await login({
          username: trimmedUsername,
          password,
        });

        saveAuthSession(response.access_token, response.user);
        router.push("/home");
        return;
      }

      await register({
        username: trimmedUsername,
        email: email.trim() || undefined,
        password,
      });

      setSuccess("Đăng ký thành công. Bạn có thể đăng nhập ngay.");
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Không thể xử lý yêu cầu lúc này.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[480px] rounded-2xl border border-primary/10 bg-surface p-8 shadow-lg shadow-primary/10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {isLogin ? "Đăng nhập" : "Đăng ký"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {isLogin
            ? "Chào mừng bạn quay trở lại với Hanzi Master"
            : "Tạo tài khoản mới để bắt đầu học tiếng Trung"}
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Tên đăng nhập</span>
          <input
            type="text"
            className="h-12 rounded-lg border border-border bg-transparent px-4 text-base outline-none ring-primary/40 transition focus:ring-2"
            placeholder="Nhập tên đăng nhập"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={submitting}
          />
        </label>

        {!isLogin && (
          <p className="-mt-3 text-xs text-muted">
            8-20 ký tự, không khoảng trắng, không dấu tiếng Việt.
          </p>
        )}

        {!isLogin && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Email (tùy chọn)</span>
            <input
              type="email"
              className="h-12 rounded-lg border border-border bg-transparent px-4 text-base outline-none ring-primary/40 transition focus:ring-2"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
            />
          </label>
        )}

        <label className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Mật khẩu</span>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="h-12 w-full rounded-lg border border-border bg-transparent px-4 pr-14 text-base outline-none ring-primary/40 transition focus:ring-2"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-muted transition hover:text-primary"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </label>

        {!isLogin && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Xác nhận mật khẩu</span>
            <input
              type={showPassword ? "text" : "password"}
              className="h-12 rounded-lg border border-border bg-transparent px-4 text-base outline-none ring-primary/40 transition focus:ring-2"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={submitting}
            />
          </label>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          className="mt-1 h-12 rounded-lg bg-primary font-bold text-slate-900 transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
        <Link
          href={isLogin ? "/register" : "/"}
          className="font-semibold text-primary hover:underline"
        >
          {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
        </Link>
      </p>
    </div>
  );
}
