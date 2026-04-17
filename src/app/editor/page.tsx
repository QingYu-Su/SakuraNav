/**
 * 编辑器页面组件
 * @description 后台管理编辑器页面，需要管理员身份验证才能访问
 */

import { redirect } from "next/navigation";
import { EditorConsole } from "@/components/editor-console";
import { getSession } from "@/lib/auth";
import { getAllSitesForAdmin, getAppSettings, getAppearances, getVisibleTags } from "@/lib/services";

/**
 * 编辑器页面组件（异步）
 * @description 验证管理员身份后渲染编辑控制台
 * @returns 编辑器页面JSX结构
 */
export default async function EditorPage() {
  const session = await getSession();

  if (!session?.isAuthenticated) {
    redirect("/");
  }

  return (
    <EditorConsole
      initialData={{
        tags: getVisibleTags(true),
        sites: getAllSitesForAdmin(),
        appearances: getAppearances(),
        settings: getAppSettings(),
      }}
    />
  );
}
