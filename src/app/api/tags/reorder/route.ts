/**
 * 标签排序 API 路由
 * @description 更新标签的显示顺序
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { reorderTags } from "@/lib/db";
import { reorderSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

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
      return jsonError("排序数据不合法");
    }

    reorderTags(parsed.data.ids);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
