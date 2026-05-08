/**
 * API Token 管理
 * GET  - 获取当前用户的令牌列表
 * POST - 创建新令牌
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { listApiTokensByUser, createApiToken } from "@/lib/services/token-repository";
import { createApiTokenSchema } from "@/lib/config/schemas";
import { MAX_API_TOKENS_PER_USER } from "@/lib/base/types";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:User:Tokens");

export async function GET() {
  try {
    const session = await requireUserSession();
    const tokens = await listApiTokensByUser(session.userId);
    return jsonOk(tokens);
  } catch {
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const body = await request.json();

    const parsed = createApiTokenSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      return jsonError(msg, 400);
    }

    try {
      const result = await createApiToken(session.userId, parsed.data);
      logger.info("API Token 已创建", { userId: session.userId, tokenId: result.id, name: result.name });
      return jsonOk(result, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "TOKEN_LIMIT_REACHED") {
        return jsonError(`每个用户最多创建 ${MAX_API_TOKENS_PER_USER} 个令牌`, 400);
      }
      throw err;
    }
  } catch {
    return jsonError("未授权", 401);
  }
}
