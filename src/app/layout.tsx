import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SakuraNav",
  description: "可管理、可搜索、支持隐藏标签的全栈导航页",
  icons: {
    icon: "/browser-tab-logo.png",
    shortcut: "/browser-tab-logo.png",
    apple: "/browser-tab-logo.png",
  },
};

const themeInitScript = `
  (() => {
    try {
      const storedTheme = window.localStorage.getItem("sakura-theme");
      let theme;
      
      if (storedTheme === "light" || storedTheme === "dark") {
        // 用户手动设置的主题优先
        theme = storedTheme;
      } else {
        // 使用服务端传递的默认主题配置
        const defaultTheme = window.__SAKURA_DEFAULT_THEME__;
        if (defaultTheme === "light" || defaultTheme === "dark") {
          theme = defaultTheme;
        } else {
          // 最后 fallback 到系统偏好
          theme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        }
      }

      const root = document.documentElement;
      root.dataset.theme = theme;
      root.style.colorScheme = theme;

      const body = document.body;
      if (body) {
        body.dataset.theme = theme;
      }
    } catch {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${notoSans.variable} ${notoSerif.variable} ${spaceGrotesk.variable}`}
    >
      <body suppressHydrationWarning>
        <Script id="sakura-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
