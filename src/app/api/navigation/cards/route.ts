/**
 * 公开社交卡片列表 API
 * @description 返回所有社交卡片类型的站点，供导航页公开访问
 */

import { getSocialCardSites } from "@/lib/services";
import { siteToSocialCard } from "@/lib/base/types";
import { jsonOk } from "@/lib/utils/utils";

export async function GET() {
  const sites = getSocialCardSites();
  const cards = sites.map(siteToSocialCard).filter((c): c is NonNullable<typeof c> => c != null);
  return jsonOk({ items: cards });
}
