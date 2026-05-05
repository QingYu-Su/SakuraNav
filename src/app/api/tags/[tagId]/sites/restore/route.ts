/**
 * 标签站点关联恢复 API 路由
 * @description 批量恢复标签与站点的关联（用于标签删除撤销）
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { restoreTagSites } from "@/lib/services";
import { reorderSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Tags:SitesRestore");

type Context = {
  params: Promise<{ tagId: string }>;
};

/**
 * 批量恢复标签与站点的关联
 * @param request - 包含站点 ID 列表的请求对象
 * @param context - 包含标签 ID 的路由上下文
 * @returns 操作结果
 */
export async function PUT(request: NextRequest, context: Context) {
  try {
    await requireUserSession();
    const { tagId } = await context.params;
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("恢复标签站点关联失败: 数据验证失败", { tagId });
      return jsonError("数据不合法");
    }

    await restoreTagSites(tagId, parsed.data.ids);
    logger.info("恢复标签站点关联成功", { tagId, count: parsed.data.ids.length });
    return jsonOk({ ok: true });
  } catch {
    logger.warning("恢复标签站点关联失败: 未授权");
    return jsonError("未授权", 401);
  }
}
