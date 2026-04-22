/**
 * 首页组件
 * @description 应用的主页，负责加载初始数据并渲染主应用组件
 */

import type { Metadata } from "next";
import Script from "next/script";
import { SakuraNavApp } from "@/components/sakura-nav/sakura-nav-app";
import { getSession } from "@/lib/base/auth";
import { getAppSettings, getAppearances, getVisibleTags, getSocialCardCount, getFloatingButtons } from "@/lib/services";
import { ADMIN_USER_ID, SOCIAL_TAG_ID } from "@/lib/base/types";

/**
 * 动态生成页面标题
 */
export function generateMetadata(): Metadata {
  const settings = getAppSettings();
  return {
    title: settings.siteName || "SakuraNav",
  };
}

/**
 * 获取可见标签列表（含社交卡片虚拟标签）
 * @param ownerId 数据所有者 ID
 */
function getTagsWithSocialCard(ownerId: string) {
  const tags = getVisibleTags(ownerId);
  const cardCount = getSocialCardCount(ownerId);
  if (cardCount > 0) {
    const settings = getAppSettings();
    tags.push({
      id: SOCIAL_TAG_ID,
      name: "社交卡片",
      slug: "social-cards",
      sortOrder: 999999,
      isHidden: false,
      logoUrl: null,
      logoBgColor: null,
      siteCount: cardCount,
      description: settings.socialTagDescription,
    });
  }
  return tags;
}

/**
 * 首页组件（异步）
 */
export default async function HomePage() {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.isAuthenticated);
  const ownerId = isAuthenticated ? session!.userId : ADMIN_USER_ID;
  const _role = session?.role ?? null;
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
        initialTags={getTagsWithSocialCard(ownerId)}
        initialAppearances={appearances}
        initialSettings={getAppSettings()}
        initialFloatingButtons={getFloatingButtons()}
        defaultTheme={defaultTheme}
      />
    </>
  );
}
