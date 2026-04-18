/**
 * 动态路由页面组件
 * @description 处理隐藏登录路径的动态路由页面，用于管理员登录入口
 */

import { notFound } from "next/navigation";

// 强制每次请求都动态渲染，确保 adminPath 变更后立即生效
export const dynamic = "force-dynamic";
import { LoginScreen } from "@/components/auth/login-screen";
import { AlreadyLoggedIn } from "@/components/auth/already-logged-in";
import { getSession } from "@/lib/auth";
import { serverConfig } from "@/lib/server-config";

type Props = {
  params: Promise<{ slug: string[] }>;
};

/**
 * 隐藏登录页面组件（异步）
 * @description 处理动态路由，匹配隐藏的管理员登录路径
 * @param props - 包含动态路由参数
 * @returns 登录页面JSX结构
 */
export default async function HiddenLoginPage({ params }: Props) {
  const { slug } = await params;
  const joinedPath = slug.join("/");

  if (joinedPath !== serverConfig.adminPath) {
    notFound();
  }

  const session = await getSession();

  // 如果已登录，显示提示页面
  if (session?.isAuthenticated) {
    return <AlreadyLoggedIn />;
  }

  return <LoginScreen />;
}
