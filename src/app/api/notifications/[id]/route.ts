/**
 * 通知配置单条操作 API
 * @description 更新、切换启用/禁用、删除单个通知配置
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getNotificationChannelById, updateNotificationChannel, toggleNotificationChannel, deleteNotificationChannel } from "@/lib/services";
import { notificationChannelSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Notifications");

type RouteContext = { params: Promise<{ id: string }> };

/** 更新通知配置 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUserSession();
    const { id } = await context.params;
    const body = await request.json();

    // 检查配置是否存在且属于当前用户
    const existing = await getNotificationChannelById(id, session.userId);
    if (!existing) {
      return jsonError("通知配置不存在", 404);
    }

    const parsed = notificationChannelSchema.safeParse(body);
    if (!parsed.success) {
      logger.warning("更新通知配置失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "参数不合法");
    }

    const channel = await updateNotificationChannel(id, session.userId, parsed.data);
    logger.info("通知配置更新成功", { channelId: id, userId: session.userId });
    return jsonOk(channel);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("更新通知配置失败", error);
    return jsonError(error instanceof Error ? error.message : "更新失败", 500);
  }
}

/** 切换通知配置启用/禁用 */
export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUserSession();
    const { id } = await context.params;

    const channel = await toggleNotificationChannel(id, session.userId);
    if (!channel) {
      return jsonError("通知配置不存在", 404);
    }

    logger.info("通知配置状态切换", { channelId: id, enabled: channel.enabled, userId: session.userId });
    return jsonOk(channel);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("切换通知配置状态失败", error);
    return jsonError(error instanceof Error ? error.message : "操作失败", 500);
  }
}

/** 删除通知配置 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUserSession();
    const { id } = await context.params;

    const success = await deleteNotificationChannel(id, session.userId);
    if (!success) {
      return jsonError("通知配置不存在", 404);
    }

    logger.info("通知配置已删除", { channelId: id, userId: session.userId });
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("删除通知配置失败", error);
    return jsonError(error instanceof Error ? error.message : "删除失败", 500);
  }
}
