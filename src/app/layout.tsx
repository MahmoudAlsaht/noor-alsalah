import type { Metadata, Viewport } from "next";
import { Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";
import { BackButtonProvider } from "@/components/BackButtonProvider";
import { AlarmListener } from "@/components/AlarmListener";
import { StatusBarConfig } from "@/components/StatusBarConfig";

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-kufi-arabic",
});

export const metadata: Metadata = {
  title: "نور الصلاة",
  description: "نور الصلاة - تطبيق مواعيد الصلاة الدقيقة لمدينة إربد. مطابق لوزارة الأوقاف الأردنية.",
  keywords: ["نور الصلاة", "مواعيد الصلاة", "إربد", "الأردن", "صلاة", "أوقات الصلاة", "prayer times"],
  authors: [{ name: "MahmoudAlsaht" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "نور الصلاة",
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={notoKufiArabic.variable}>
        <BackButtonProvider>
          <StatusBarConfig />
          <AlarmListener />
          {children}
        </BackButtonProvider>
      </body>
    </html>
  );
}
