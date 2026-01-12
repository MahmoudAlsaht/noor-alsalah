import type { Metadata, Viewport } from "next";
import { Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  title: "أوقات الصلاة | إربد",
  description: "تطبيق مواعيد الصلاة الدقيقة لمدينة إربد - الأردن. مطابق لوزارة الأوقاف الأردنية.",
  keywords: ["مواعيد الصلاة", "إربد", "الأردن", "صلاة", "أوقات الصلاة", "prayer times"],
  authors: [{ name: "MahmoudAlsaht" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "أوقات الصلاة",
  },
  icons: {
    icon: "/icon-512x512.png",
    shortcut: "/icon-192x192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={notoKufiArabic.variable}>
        {children}
      </body>
    </html>
  );
}
