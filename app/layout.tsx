import type { Metadata } from "next";
import { BRAND_NAME } from "@/components/maison/MaisonBrandName";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — A living world for people who want to feel more alive`,
  description:
    "A living world for people who want to feel more alive inside their own lives. Journal, recipes, rituals, wellness, escapes and the Goldprint Academy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body>
        {children}
      </body>
    </html>
  );
}
