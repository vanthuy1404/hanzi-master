import { ReactNode } from "react";
import { MainLayout } from "@/components/main-layout";

export default function AppMainLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <MainLayout>{children}</MainLayout>;
}
