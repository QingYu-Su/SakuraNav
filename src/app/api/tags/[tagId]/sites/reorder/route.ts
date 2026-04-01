/**
 * 标签内网站排序 API 路由
 * @description 更新指定标签内网站的显示顺序
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { reorderSitesInTag } from "@/lib/db";
import { reorderSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("API:Sites:ReorderInTag");

type Context = {
  params: Promise<{ tagId: string }>;
};

/**
 * 更新标签内网站排序
 * @param request - 包含网站ID顺序数组的请求对象
 * @param context - 包含标签ID的路由上下文
 * @returns 操作结果
 */
export async function PUT(request: NextRequest, context: Context) {
  try {
    await requireAdminSession();
    const { tagId } = await context.params;
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("标签内网站重排序失败: 数据验证失败", { tagId });
      return jsonError("排序数据不合法");
    }

    reorderSitesInTag(tagId, parsed.data.ids);
    logger.info("标签内网站重排序成功", { tagId, count: parsed.data.ids.length });
    return jsonOk({ ok: true });
  } catch {
    logger.warning("标签内网站重排序失败: 未授权");
    return jsonError("未授权", 401);
  }
}
