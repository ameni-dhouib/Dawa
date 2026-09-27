import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession, DEMO_USERS } from "@/lib/session";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = getSession();
  if (s?.role !== "admin") redirect("/login");
  const subtitle = DEMO_USERS.find((u) => u.email === s.email)?.subtitle ?? "Administrator";
  return <AppShell role="admin" name={s.name} subtitle={subtitle}>{children}</AppShell>;
}
