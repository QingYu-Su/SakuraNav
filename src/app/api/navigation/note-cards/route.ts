/**
* 公开笔记卡片列表 API
* @description 返回所有笔记卡片，供导航页公开访问
*/

import { getOptionalSession } from "@/lib/base/auth";
import { getNoteCards } from "@/lib/services";
import { ADMIN_USER_ID, cardToNoteCard } from "@/lib/base/types";
import { jsonOk } from "@/lib/utils/utils";

export async function GET() {
  const session = await getOptionalSession();
  const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
  const cards = await getNoteCards(ownerId);
  const noteCards = cards.map(cardToNoteCard).filter((c): c is NonNullable<typeof c> => c != null);
  return jsonOk({ items: noteCards });
}
