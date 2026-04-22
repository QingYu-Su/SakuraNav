/**
 * 登录页面
 * @description 固定路由 /login，支持登录和注册
 */

import { LoginScreen } from "@/components/auth/login-screen";
import { AlreadyLoggedIn } from "@/components/auth/already-logged-in";
import { getSession } from "@/lib/base/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();

  if (session?.isAuthenticated) {
    return <AlreadyLoggedIn />;
  }

  return <LoginScreen />;
}
