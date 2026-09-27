export function Cross({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="7" fill="#0B7A55" />
      <path d="M12.5 6h7v6.5H26v7h-6.5V26h-7v-6.5H6v-7h6.5z" fill="white" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Cross />
      <span className={`text-[21px] font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>Dawa</span>
    </span>
  );
}
