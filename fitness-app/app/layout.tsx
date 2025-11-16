import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TD Fitness - Consultoria Online",
  description: "Aplicativo de consultoria fitness com Treinador David - Personal Trainer CREF 7-016401-G/DF com 27 anos de experiência",
  keywords: ["fitness", "personal trainer", "consultoria online", "treino personalizado", "hipertrofia", "emagrecimento"],
  authors: [{ name: "Treinador David" }],
  creator: "Treinador David",
  manifest: "/manifest.json",
  themeColor: "#0EA5E9",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TD Fitness",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
