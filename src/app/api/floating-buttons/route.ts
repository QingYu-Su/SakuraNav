/**
 * 悬浮按钮配置 API 路由
 * @description 处理右下角悬浮按钮的配置获取和更新
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getFloatingButtons, updateFloatingButtons } from "@/lib/services";
import { floatingButtonsSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:FloatingButtons");

export async function GET() {
  try {
    await requireUserSession();
    return jsonOk(getFloatingButtons());
  } catch {
    logger.warning("获取悬浮按钮配置失败: 未授权");
    return jsonError("未授权", 401);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireUserSession();
    const parsed = floatingButtonsSchema.safeParse(await request.json());

    if (!parsed.success) {
      logger.warning("更新悬浮按钮配置失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "配置数据不合法");
    }

    updateFloatingButtons(parsed.data.buttons);
    logger.info("悬浮按钮配置更新成功");
    return jsonOk(getFloatingButtons());
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("更新悬浮按钮配置失败: 未授权");
      return jsonError("未授权", 401);
    }
    logger.error("更新悬浮按钮配置失败", error);
    return jsonError(error instanceof Error ? error.message : "保存失败", 500);
  }
}
