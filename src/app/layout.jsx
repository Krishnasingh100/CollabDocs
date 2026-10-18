import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
export const metadata = {
  title: "CollabDocs — Write, organize, export",
  description:
    "CollabDocs is a personal document editor with starter templates, a clean page view, and one-click export to PDF, HTML, text, or JSON.",
};
// Takes children, provides fonts and tooltip context. Returns root HTML shell.
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={cn(
        "h-full scroll-smooth",
        "antialiased",
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
