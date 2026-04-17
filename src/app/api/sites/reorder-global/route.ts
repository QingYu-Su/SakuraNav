/**
 * 全局网站排序 API 路由
 * @description 更新网站的全局显示顺序
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { reorderSitesGlobal } from "@/lib/services";
import { reorderSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("API:Sites:Reorder");

/**
 * 更新网站全局排序
 * @param request - 包含网站ID顺序数组的请求对象
 * @returns 操作结果
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("网站重排序失败: 数据验证失败");
      return jsonError("排序数据不合法");
    }

    reorderSitesGlobal(parsed.data.ids);
    logger.info("网站全局重排序成功", { count: parsed.data.ids.length });
    return jsonOk({ ok: true });
  } catch {
    logger.warning("网站重排序失败: 未授权");
    return jsonError("未授权", 401);
  }
}
