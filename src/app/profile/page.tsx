/**
 * 个人空间页面
 * @description 展示和编辑用户资料（头像、昵称），提供修改密码、退出登录功能
 * @description 参考登录页排版风格（动态背景 + 毛玻璃卡片）
 */

import { AlreadyLoggedIn } from "@/components/auth/already-logged-in";
import { getSession } from "@/lib/base/auth";
import { ProfilePageClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session?.isAuthenticated) {
    return <AlreadyLoggedIn />;
  }

  return <ProfilePageClient />;
}
