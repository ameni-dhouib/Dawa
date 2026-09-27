"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ClipboardPlus, Files, LogOut, Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const NAV = {
  doctor: [
    { href: "/doctor", label: "New prescription", icon: ClipboardPlus, exact: true },
    { href: "/doctor/prescriptions", label: "My prescriptions", icon: Files },
  ],
};

export function AppShell({ role, name, subtitle, children }: { role: "doctor"; name: string; subtitle: string; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV[role];

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              active ? "bg-white/10 text-white font-medium" : "text-white/65 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon size={18} strokeWidth={1.8} className={active ? "text-[#5FD3A4]" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 pt-4 mt-4">
      <p className="text-sm font-medium text-white">{name}</p>
      <p className="text-xs text-white/55 mb-3">{subtitle}</p>
      <form action="/api/auth/logout" method="post">
        <button className="flex items-center gap-2 text-sm text-white/65 hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          <LogOut size={16} /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col bg-ink px-4 py-6 sticky top-0 h-screen">
        <div className="px-2 mb-8"><Logo light /></div>
        <div className="flex-1">{nav}</div>
        {footer}
      </aside>

      <header className="app-top lg:hidden bg-ink px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Logo light />
        <button onClick={() => setOpen((o) => !o)} className="text-white p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      {open && (
        <div className="lg:hidden bg-ink px-4 pb-5 sticky top-[60px] z-20 no-print">
          {nav}
          {footer}
        </div>
      )}

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-7 no-print">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
        {description && <p className="text-ink-soft mt-1.5 max-w-[62ch]">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
