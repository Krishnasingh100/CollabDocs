import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CollabDocs — Write together, in real time",
  description: "CollabDocs is a real-time collaborative document platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans", inter.variable, fraunces.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}