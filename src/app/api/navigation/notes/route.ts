/**
 * 公开笔记卡片列表 API
 * @description 返回所有笔记卡片，供导航页公开访问
 */

import { getSession } from "@/lib/base/auth";
import { getNoteCardSites } from "@/lib/services";
import { ADMIN_USER_ID, siteToNoteCard } from "@/lib/base/types";
import { jsonOk } from "@/lib/utils/utils";

export async function GET() {
  const session = await getSession();
  const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
  const sites = await getNoteCardSites(ownerId);
  const cards = sites.map(siteToNoteCard).filter((c): c is NonNullable<typeof c> => c != null);
  return jsonOk({ items: cards });
}
