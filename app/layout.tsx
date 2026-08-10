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
        {/* The house's four typefaces, loaded for the whole app.

            They *look* like they are loaded by the @import at the top of
            app/globals.css. They are not: Turbopack silently drops external
            url() @imports from CSS, so that line has never produced a single
            request — verified in the browser, where document.styleSheets holds
            only the compiled globals chunk and no @font-face is registered at
            all. Every page has been rendering in Georgia and the system sans,
            and only looked right on machines with Playfair installed locally.

            GoldenStory.jsx found this first and fixed it for itself with a
            <link> of its own (see the comment at GoldenStory.jsx:748). This is
            the same fix, one level up, so the rest of the app gets its fonts
            too — the families and weights here are exactly the set globals.css
            asks for, Dancing Script included, which the observatory needs.
            React hoists a precedence-bearing stylesheet into <head>.

            The obvious alternative is next/font/google, which self-hosts and
            drops the third-party request. It is not a drop-in here: next/font
            generates a hashed family name, and ~50 files across the app name
            "Playfair Display" and "Lato" literally in inline styles and CSS
            modules, so every one of them would have to be rewritten in the
            same change. Worth doing on its own day. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* The rule is a Pages Router heuristic — it wants fonts in
            pages/_document.js. In the App Router this file is that place: one
            root layout, every route. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          precedence="default"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Lato:wght@300;400;700&family=Great+Vibes&family=Dancing+Script:wght@400;500;600&display=swap"
        />
        {children}
      </body>
    </html>
  );
}
