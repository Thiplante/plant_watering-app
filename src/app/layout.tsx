import type { Metadata } from "next";
import "./globals.css";
import HeaderWrapper from "@/components/HeaderWrapper";

export const metadata: Metadata = {
  title: "Plant Watering",
  description: "Suivi d'arrosage des plantes avec rappels et meteo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <HeaderWrapper />
        {children}
      </body>
    </html>
  );
}
