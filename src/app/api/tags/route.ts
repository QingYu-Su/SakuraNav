/**
 * 标签管理 API 路由
 * @description 处理标签的增删改查操作，包括获取标签列表、创建、更新和删除标签
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createTag, deleteTag, getVisibleTags, updateTag } from "@/lib/db";
import { tagInputSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("API:Tags");

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
    logger.info("获取标签列表");
    return jsonOk({ items: getVisibleTags(true) });
  } catch {
    logger.warning("获取标签列表失败: 未授权");
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
      logger.warning("创建标签失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "标签数据不合法");
    }

    const tag = createTag({
      ...parsed.data,
      logoUrl: parsed.data.logoUrl?.trim() || null,
      logoBgColor: parsed.data.logoBgColor || null,
    });

    if (!tag) {
      logger.error("创建标签失败: 数据库返回空值");
      return jsonError("创建标签失败", 500);
    }

    logger.info("标签创建成功", { tagId: tag.id, name: tag.name });
    return jsonOk({ item: tag });
  } catch (error) {
    logger.error("创建标签失败", error);
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = tagUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("更新标签失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "标签数据不合法");
    }

    const tag = updateTag({
      ...parsed.data,
      logoUrl: parsed.data.logoUrl?.trim() || null,
      logoBgColor: parsed.data.logoBgColor || null,
    });

    logger.info("标签更新成功", { tagId: tag?.id, name: tag?.name });
    return jsonOk({ item: tag });
  } catch (error) {
    logger.error("更新标签失败", error);
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
      logger.warning("删除标签失败: 缺少标签 ID");
      return jsonError("缺少标签 ID");
    }

    deleteTag(id);
    logger.info("标签删除成功", { tagId: id });
    return jsonOk({ ok: true });
  } catch {
    logger.warning("删除标签失败: 未授权");
    return jsonError("未授权", 401);
  }
}
