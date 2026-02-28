import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextRole — AI Job Search Assistant",
  description: "AI-powered job search, auto resume tailoring, cover letter generation, and hiring manager finder. Get hired faster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
