/**
 * 社交卡片排序 API 路由
 * @description 处理社交卡片的拖拽排序（底层使用 sites 表的 global_sort_order）
 */

import { requireUserSession } from "@/lib/base/auth";
import { reorderSitesGlobal } from "@/lib/services";
import { reorderSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";

export async function PUT(request: Request) {
  try {
    await requireUserSession();
    const parsed = reorderSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "排序数据不合法");
    }

    await reorderSitesGlobal(parsed.data.ids);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
