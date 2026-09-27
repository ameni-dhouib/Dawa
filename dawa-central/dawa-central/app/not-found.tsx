import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-center px-6">
      <div>
        <h1 className="text-2xl font-bold">This page doesn&apos;t exist</h1>
        <p className="text-ink-soft mt-2">Check the address, or go back to the dashboard.</p>
        <Link href="/" className="btn-primary mt-5">Go to your dashboard</Link>
      </div>
    </div>
  );
}
