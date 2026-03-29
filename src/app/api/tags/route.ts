/**
 * 标签管理 API 路由
 * @description 处理标签的增删改查操作，包括获取标签列表、创建、更新和删除标签
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createTag, deleteTag, getVisibleTags, updateTag } from "@/lib/db";
import { tagInputSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

const tagUpdateSchema = tagInputSchema.extend({
  id: tagInputSchema.shape.name,
});

/**
 * 获取所有标签列表（管理员）
 * @returns 标签列表数据
 */
export async function GET() {
  try {
    await requireAdminSession();
    return jsonOk({ items: getVisibleTags(true) });
  } catch {
    return jsonError("未授权", 401);
  }
}

/**
 * 创建新标签
 * @param request - 包含标签数据的请求对象
 * @returns 创建的标签数据
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = tagInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "标签数据不合法");
    }

    return jsonOk({
      item: createTag({
        ...parsed.data,
        logoUrl: parsed.data.logoUrl?.trim() || null,
      }),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = tagUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "标签数据不合法");
    }

    return jsonOk({
      item: updateTag({
        ...parsed.data,
        logoUrl: parsed.data.logoUrl?.trim() || null,
      }),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "更新失败", 500);
  }
}

/**
 * 删除标签
 * @param request - 包含标签ID的请求对象
 * @returns 删除结果
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdminSession();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return jsonError("缺少标签 ID");
    }

    deleteTag(id);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
