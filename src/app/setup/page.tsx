/**
 * 管理员初始化引导页面
 * @description 首次启动时显示，引导用户创建管理员账户
 */

import { redirect } from "next/navigation";
import { SetupScreen } from "@/components/auth/setup-screen";
import { isAdminInitialized } from "@/lib/services/user-repository";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // 已初始化则重定向到首页
  if (await isAdminInitialized()) {
    redirect("/");
  }
  return <SetupScreen />;
}
