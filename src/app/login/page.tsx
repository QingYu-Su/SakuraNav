/**
 * 登录页面
 * @description 固定路由 /login，支持登录和注册
 */

import { LoginScreen } from "@/components/auth/login-screen";
import { AlreadyLoggedIn } from "@/components/auth/already-logged-in";
import { getSession } from "@/lib/base/auth";
import { getAppSettings } from "@/lib/services";
import { isAdminInitialized } from "@/lib/services/user-repository";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // 未初始化则跳转到引导设置页
  if (!isAdminInitialized()) {
    redirect("/setup");
  }

  const session = await getSession();

  if (session?.isAuthenticated) {
    return <AlreadyLoggedIn />;
  }

  const settings = getAppSettings();
  return <LoginScreen registrationEnabled={settings.registrationEnabled} />;
}
