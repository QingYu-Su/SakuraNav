/**
 * 公开社交卡片列表 API
 * @description 返回所有社交卡片类型的站点，供导航页公开访问
 */

import { getSession } from "@/lib/base/auth";
import { getSocialCardSites } from "@/lib/services";
import { ADMIN_USER_ID, siteToSocialCard } from "@/lib/base/types";
import { jsonOk } from "@/lib/utils/utils";

export async function GET() {
  const session = await getSession();
  const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
  const sites = await getSocialCardSites(ownerId);
  const cards = sites.map(siteToSocialCard).filter((c): c is NonNullable<typeof c> => c != null);
  return jsonOk({ items: cards });
}
