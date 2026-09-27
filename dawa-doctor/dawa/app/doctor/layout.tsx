import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession, DEMO_USERS } from "@/lib/session";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const s = getSession();
  if (s?.role !== "doctor") redirect("/login");
  const subtitle = DEMO_USERS.find((u) => u.email === s.email)?.subtitle ?? "Doctor";
  return <AppShell role="doctor" name={s.name} subtitle={subtitle}>{children}</AppShell>;
}
