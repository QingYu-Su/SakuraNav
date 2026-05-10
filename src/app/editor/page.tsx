/**
 * 编辑器页面组件
 * @description 后台管理编辑器页面，需要管理员身份验证才能访问
 */

import { EditorConsole } from "@/components/admin/editor-console";
import { requireAdminSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getAllCardsForAdmin, getAppSettings, getAppearances, getVisibleTags } from "@/lib/services";

export default async function EditorPage() {
  const session = await requireAdminSession();
  const ownerId = getEffectiveOwnerId(session);

  return (
    <EditorConsole
      initialData={{
        tags: await getVisibleTags(ownerId),
        cards: await getAllCardsForAdmin(ownerId),
        appearances: await getAppearances(ownerId),
        settings: await getAppSettings(),
      }}
    />
  );
}
