/**
 * 通知配置 API 路由
 * @description 当前用户的通知配置 CRUD（所有登录用户可用）
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getNotificationChannels, createNotificationChannel } from "@/lib/services";
import { notificationChannelSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { randomUUID } from "crypto";

const logger = createLogger("API:Notifications");

/** 获取当前用户的所有通知配置 */
export async function GET() {
  try {
    const session = await requireUserSession();
    const channels = await getNotificationChannels(session.userId);
    return jsonOk(channels);
  } catch {
    return jsonError("未授权", 401);
  }
}

/** 创建通知配置 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const body = await request.json();

    const parsed = notificationChannelSchema.safeParse(body);
    if (!parsed.success) {
      logger.warning("创建通知配置失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "参数不合法");
    }

    const channel = await createNotificationChannel({
      id: randomUUID(),
      ownerId: session.userId,
      ...parsed.data,
    });

    logger.info("通知配置创建成功", { channelId: channel.id, userId: session.userId });
    return jsonOk(channel, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("创建通知配置失败", error);
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}
