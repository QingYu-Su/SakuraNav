/**
 * 登录页面
 * @description 固定路由 /login，支持登录和注册
 */

import { LoginScreen } from "@/components/auth/login-screen";
import { getSession } from "@/lib/base/auth";
import { getAppSettings } from "@/lib/services";
import { isAdminInitialized } from "@/lib/services/user-repository";
import { getEnabledOAuthProviders } from "@/lib/utils/oauth-providers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // 未初始化则跳转到引导设置页
  if (!isAdminInitialized()) {
    redirect("/setup");
  }

  const session = await getSession();

  // OAuth 成功回调时，即使已认证也显示 LoginScreen（含成功弹窗）
  const settings = getAppSettings();
  const oauthProviders = getEnabledOAuthProviders();

  if (session?.isAuthenticated) {
    // 如果是 OAuth 成功回调，不显示 AlreadyLoggedIn，而是显示 LoginScreen + 成功弹窗
    return <LoginScreen registrationEnabled={settings.registrationEnabled} oauthProviders={oauthProviders} />;
  }

  return <LoginScreen registrationEnabled={settings.registrationEnabled} oauthProviders={oauthProviders} />;
}
