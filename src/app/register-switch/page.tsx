/**
 * 注册页面（切换用户场景专用）
 * @description 从切换用户弹窗中"去注册"链接打开，注册成功后返回主页（而非登录页）
 * @description 允许已登录用户访问，因为此页面的目的是注册新用户（不会自动切换身份）
 */

import { RegisterSwitchScreen } from "@/components/auth/register-switch-screen";
import { getAppSettings } from "@/lib/services";
import { isAdminInitialized } from "@/lib/services/user-repository";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterSwitchPage() {
  if (!await isAdminInitialized()) {
    redirect("/setup");
  }

  // 注意：此页面允许已登录用户访问，不进行登录检查
  // 因为目的是注册一个新用户账号，而非切换当前登录状态
  const settings = await getAppSettings();
  return <RegisterSwitchScreen registrationEnabled={settings.registrationEnabled} />;
}
