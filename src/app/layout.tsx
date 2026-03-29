/**
 * 根布局组件
 * @description 应用的根布局文件，负责配置全局字体、主题初始化和基础HTML结构
 */

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

/**
 * 主题初始化脚本
 * 在页面加载前执行，根据用户偏好或系统设置初始化主题
 */
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

/**
 * 根布局组件
 * @param children - 子组件
 * @returns HTML根结构
 */
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
