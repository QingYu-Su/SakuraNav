/**
 * 首页组件
 * @description 应用的主页，负责加载初始数据并渲染主应用组件
 */

import type { Metadata } from "next";
import Script from "next/script";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SakuraNavApp } from "@/components/sakura-nav/sakura-nav-app";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/base/auth";
import { getAppSettings, getAppearances, getDefaultTheme, getVisibleTags, getFloatingButtons, injectVirtualTags } from "@/lib/services";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { isAdminInitialized } from "@/lib/services/user-repository";

/** 将 API Key 掩码为 ****xxxx 格式（仅保留末尾 4 位） */
function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return key ? "****" : "";
  return `****${key.slice(-4)}`;
}

/**
 * 动态生成页面标题
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: settings.siteName || "SakuraNav",
  };
}

/**
 * 获取可见标签列表（含虚拟标签：社交卡片、笔记卡片）
 * @param ownerId 数据所有者 ID
 */
async function getTagsWithVirtualTags(ownerId: string) {
  const tags = await getVisibleTags(ownerId);
  await injectVirtualTags(tags, ownerId);
  return tags;
}

/**
 * 首页组件（异步）
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 检查管理员是否已初始化，未初始化则跳转到引导设置页
  if (!await isAdminInitialized()) {
    redirect("/setup");
  }

  const session = await getSession();
  const isAuthenticated = Boolean(session?.isAuthenticated);

  // 检测会话失效：用户有 cookie 但会话验证失败（如用户已被删除）
  const cookieStore = await cookies();
  const hadSessionCookie = Boolean(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const sessionInvalidated = hadSessionCookie && !isAuthenticated;

  // 管理员使用 __admin__（与游客共享数据），普通用户使用自身 userId
  const ownerId = isAuthenticated
    ? (session!.role === "admin" ? ADMIN_USER_ID : session!.userId)
    : ADMIN_USER_ID;
  const appearances = await getAppearances(ownerId);

  // 确定默认主题（从管理员外观行读取 is_default 标记）
  const defaultTheme = await getDefaultTheme();

  // 安全处理：对 AI API Key 掩码后再传给客户端组件，避免明文泄露到 HTML 中
  const rawSettings = await getAppSettings();
  const safeSettings = {
    ...rawSettings,
    aiApiKey: maskApiKey(rawSettings.aiApiKey),
    aiApiKeyMasked: !!rawSettings.aiApiKey,
  };

  return (
    <>
      <Script id="sakura-default-theme" strategy="beforeInteractive">
        {`window.__SAKURA_DEFAULT_THEME__ = "${defaultTheme}";`}
      </Script>
      <SakuraNavApp
        initialSession={session}
        sessionInvalidated={sessionInvalidated}
        initialTags={await getTagsWithVirtualTags(ownerId)}
        initialAppearances={appearances}
        initialSettings={safeSettings}
        initialFloatingButtons={await getFloatingButtons()}
        defaultTheme={defaultTheme}
      />
    </>
  );
}
