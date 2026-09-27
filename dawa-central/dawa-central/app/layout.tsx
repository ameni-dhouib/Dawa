import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dawa Central — stock and demand planning",
  description: "Central pharmacy stock, regional stock, sales analysis and demand forecasting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%230B7A55'/><path d='M12.5 6h7v6.5H26v7h-6.5V26h-7v-6.5H6v-7h6.5z' fill='white'/></svg>" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
