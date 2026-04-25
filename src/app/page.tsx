/**
 * 首页组件
 * @description 应用的主页，负责加载初始数据并渲染主应用组件
 */

import type { Metadata } from "next";
import Script from "next/script";
import { redirect } from "next/navigation";
import { SakuraNavApp } from "@/components/sakura-nav/sakura-nav-app";
import { getSession } from "@/lib/base/auth";
import { getAppSettings, getAppearances, getDefaultTheme, getVisibleTags, getSocialCardCount, getFloatingButtons } from "@/lib/services";
import { ADMIN_USER_ID, SOCIAL_TAG_ID } from "@/lib/base/types";
import { isAdminInitialized } from "@/lib/services/user-repository";

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
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 检查管理员是否已初始化，未初始化则跳转到引导设置页
  if (!isAdminInitialized()) {
    redirect("/setup");
  }

  const session = await getSession();
  const isAuthenticated = Boolean(session?.isAuthenticated);
  // 管理员使用 __admin__（与游客共享数据），普通用户使用自身 userId
  const ownerId = isAuthenticated
    ? (session!.role === "admin" ? ADMIN_USER_ID : session!.userId)
    : ADMIN_USER_ID;
  const _role = session?.role ?? null;
  const appearances = getAppearances(ownerId);

  // 确定默认主题（从管理员外观行读取 is_default 标记）
  const defaultTheme = getDefaultTheme();

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
