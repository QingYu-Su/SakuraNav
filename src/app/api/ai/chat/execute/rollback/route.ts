/**
 * AI 助手操作紧急回滚 API
 * @description 页面刷新/关闭时通过 sendBeacon 触发，立即回滚到指定快照
 */

import { NextRequest } from "next/server";
import { getSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { restoreFromSnapshot, getSnapshotById } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:AI:ExecuteRollback");

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isAuthenticated) {
      return jsonError("未登录", 401);
    }

    const body = await request.json() as { snapshotId?: string };
    if (!body.snapshotId) {
      return jsonError("缺少 snapshotId", 400);
    }

    const ownerId = getEffectiveOwnerId(session);

    // 验证快照属于当前用户
    const snapshot = await getSnapshotById(body.snapshotId, ownerId);
    if (!snapshot) {
      return jsonError("快照不存在", 404);
    }

    // 执行回滚
    const ok = await restoreFromSnapshot(body.snapshotId, ownerId);
    if (ok) {
      logger.info("紧急回滚成功", { snapshotId: body.snapshotId });
      return jsonOk({ rolledBack: true });
    }
    return jsonError("回滚失败", 500);
  } catch (error) {
    logger.error("紧急回滚失败", error);
    return jsonError("回滚失败", 500);
  }
}
