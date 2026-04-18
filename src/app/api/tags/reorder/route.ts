/**
 * 标签排序 API 路由
 * @description 更新标签的显示顺序
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/base/auth";
import { reorderTags } from "@/lib/services";
import { reorderSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Tags:Reorder");

/**
 * 更新标签排序
 * @param request - 包含标签ID顺序数组的请求对象
 * @returns 操作结果
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("标签重排序失败: 数据验证失败");
      return jsonError("排序数据不合法");
    }

    reorderTags(parsed.data.ids);
    logger.info("标签重排序成功", { count: parsed.data.ids.length });
    return jsonOk({ ok: true });
  } catch {
    logger.warning("标签重排序失败: 未授权");
    return jsonError("未授权", 401);
  }
}
