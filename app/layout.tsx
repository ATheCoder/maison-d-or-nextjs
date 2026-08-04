import type { Metadata } from "next";
import { BRAND_NAME } from "@/components/maison/MaisonBrandName";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — A living world for people who want to feel more alive`,
  // Describes what ships, not the legacy base44 brand: the Journal, Recipes,
  // Rituals, Wellness, Escapes and Academy this used to name are cut routes,
  // and a crawler is the last audience that should still be hearing about them.
  description:
    "A living world for people who want to feel more alive inside their own lives. A new Daily Gold Edition each morning — a destination, the lives born today, the news worth telling a child — and a family's own passport and treasury.",
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
