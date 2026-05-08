/**
 * API Token 删除
 * DELETE - 删除指定令牌
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { deleteApiToken } from "@/lib/services/token-repository";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:User:Tokens:Delete");

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUserSession();
    const { id } = await params;

    const deleted = await deleteApiToken(id, session.userId);
    if (!deleted) {
      return jsonError("令牌不存在", 404);
    }

    logger.info("API Token 已删除", { userId: session.userId, tokenId: id });
    return jsonOk({ success: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
