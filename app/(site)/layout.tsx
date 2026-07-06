import MaisonHeader from "@/components/maison/MaisonHeader";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <MaisonHeader />
      {children}
    </>
  );
}
