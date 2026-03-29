/**
 * 首页组件
 * @description 应用的主页，负责加载初始数据并渲染主应用组件
 */

import Script from "next/script";
import { SakuraNavApp } from "@/components/sakura-nav-app";
import { getSession } from "@/lib/auth";
import { getAppSettings, getAppearances, getVisibleTags } from "@/lib/db";

/**
 * 首页组件（异步）
 * @description 服务端获取初始数据并渲染应用主组件
 * @returns 首页JSX结构
 */
export default async function HomePage() {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.isAuthenticated);
  const appearances = getAppearances();

  // 确定默认主题
  const defaultTheme = appearances.dark.isDefault ? "dark" : 
                       appearances.light.isDefault ? "light" : 
                       "dark";

  return (
    <>
      <Script id="sakura-default-theme" strategy="beforeInteractive">
        {`window.__SAKURA_DEFAULT_THEME__ = "${defaultTheme}";`}
      </Script>
      <SakuraNavApp
        initialSession={session}
        initialTags={getVisibleTags(isAuthenticated)}
        initialAppearances={appearances}
        initialSettings={getAppSettings()}
        defaultTheme={defaultTheme}
      />
    </>
  );
}
