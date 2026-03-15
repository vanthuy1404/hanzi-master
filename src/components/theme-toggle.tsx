"use client";

export function ThemeToggle() {
  function handleToggle() {
    const currentValue = document.documentElement.classList.contains("dark");
    const nextValue = !currentValue;

    document.documentElement.classList.toggle("dark", nextValue);
    localStorage.setItem("theme", nextValue ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
      aria-label="Đổi chế độ sáng tối"
    >
      Sáng/Tối
    </button>
  );
}
