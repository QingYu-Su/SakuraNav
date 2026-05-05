/**
 * 标签排序 API 路由
 * @description 更新标签的显示顺序，支持虚拟标签（社交卡片/笔记卡片）的位置持久化
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { SOCIAL_TAG_ID, NOTE_TAG_ID } from "@/lib/base/types";
import { reorderTags, saveVirtualTagSortOrders } from "@/lib/services";
import { reorderSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Tags:Reorder");

/**
 * 更新标签排序
 * @param request - 包含标签ID顺序数组的请求对象（可包含虚拟标签ID）
 * @returns 操作结果
 */
export async function PUT(request: NextRequest) {
  try {
    await requireUserSession();
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("标签重排序失败: 数据验证失败");
      return jsonError("排序数据不合法");
    }

    const ids = parsed.data.ids;
    const isVirtual = (id: string) => id === SOCIAL_TAG_ID || id === NOTE_TAG_ID;

    // 保存虚拟标签的排序位置到 app_settings
    const virtualPositions: Record<string, number> = {};
    ids.forEach((id: string, i: number) => {
      if (isVirtual(id)) virtualPositions[id] = i;
    });
    if (Object.keys(virtualPositions).length > 0) {
      await saveVirtualTagSortOrders(virtualPositions);
    }

    // 只对真实标签执行数据库排序
    const realIds = ids.filter((id: string) => !isVirtual(id));
    await reorderTags(realIds);

    logger.info("标签重排序成功", { count: ids.length });
    return jsonOk({ ok: true });
  } catch {
    logger.warning("标签重排序失败: 未授权");
    return jsonError("未授权", 401);
  }
}
