/**
* 全局网站卡片排序 API 路由
* @description 更新网站卡片的全局显示顺序
*/

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { reorderCardsGlobal } from "@/lib/services";
import { reorderSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:SiteCards:Reorder");

/**
* 更新网站卡片全局排序
* @param request - 包含卡片ID顺序数组的请求对象
* @returns 操作结果
*/
export async function PUT(request: NextRequest) {
  try {
    await requireUserSession();
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("网站卡片重排序失败: 数据验证失败");
      return jsonError("排序数据不合法");
    }

    await reorderCardsGlobal(parsed.data.ids);
    logger.info("网站卡片全局重排序成功", { count: parsed.data.ids.length });
    return jsonOk({ ok: true });
  } catch {
    logger.warning("网站卡片重排序失败: 未授权");
    return jsonError("未授权", 401);
  }
}
