/**
 * @description MCP 认证模块 - 从请求中提取并验证 Bearer Token
 * 复用现有 API Token 认证机制，为 MCP 端点提供身份验证
 */

import { createHash } from "crypto";
import { getApiTokenByHash, updateTokenLastUsed } from "@/lib/services/token-repository";
import { getUserById } from "@/lib/services/user-repository";
import { getAsset } from "@/lib/services/asset-repository";
import { SessionUser, ADMIN_USER_ID } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("McpAuth");

/** 从 app_settings 读取管理员扩展资料 */
async function getAdminExtendedProfile() {
  try {
    const db = await getDb();
    const rows = await db.query<{ key: string; value: string }>(
      "SELECT key, value FROM app_settings WHERE key IN ('admin_nickname', 'admin_avatar_asset_id')"
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const nickname = map.get("admin_nickname") || null;
    const avatarAssetId = map.get("admin_avatar_asset_id") ?? null;
    let avatarUrl: string | null = null;
    if (avatarAssetId) {
      const asset = await getAsset(avatarAssetId);
      if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
    }
    return { nickname, avatarUrl };
  } catch {
    return { nickname: null, avatarUrl: null };
  }
}

async function getTokensValidAfter(userId: string): Promise<number> {
  try {
    const db = await getDb();
    const row = await db.queryOne<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = ?",
      [`tokens_valid_after:${userId}`]
    );
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * 从 HTTP 请求中验证 Bearer Token 并返回用户会话
 * MCP 端点强制要求有效 Token，无 Token 返回 null
 */
export async function authenticateMcpRequest(request: Request): Promise<SessionUser | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    const rawToken = authHeader.slice(7).trim();
    if (!rawToken.startsWith("sak_")) return null;

    const hash = createHash("sha256").update(rawToken).digest("hex");
    const apiToken = await getApiTokenByHash(hash);
    if (!apiToken) {
      logger.warning("MCP Token 验证失败: 令牌不存在", { prefix: rawToken.slice(0, 8) });
      return null;
    }

    // 检查过期
    if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
      logger.warning("MCP Token 已过期", { tokenId: apiToken.id });
      return null;
    }

    // 检查用户是否被吊销
    const validAfter = await getTokensValidAfter(apiToken.userId);
    const tokenCreated = new Date(apiToken.createdAt).getTime() / 1000;
    if (validAfter > 0 && tokenCreated < validAfter) {
      logger.warning("MCP Token 已被吊销", { tokenId: apiToken.id });
      return null;
    }

    // 获取用户信息
    if (apiToken.userId === ADMIN_USER_ID) {
      const admin = await getAdminExtendedProfile();
      updateTokenLastUsed(apiToken.id).catch(() => {});
      return {
        username: "admin",
        userId: ADMIN_USER_ID,
        role: "admin",
        isAuthenticated: true,
        nickname: admin.nickname,
        avatarUrl: admin.avatarUrl,
        avatarColor: null,
      };
    }

    const user = await getUserById(apiToken.userId);
    if (!user) {
      logger.warning("MCP Token 用户不存在", { userId: apiToken.userId });
      return null;
    }

    let avatarUrl: string | null = null;
    if (user.avatarAssetId) {
      const asset = await getAsset(user.avatarAssetId);
      if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
    }

    updateTokenLastUsed(apiToken.id).catch(() => {});

    return {
      username: user.username,
      userId: user.id,
      role: user.role,
      isAuthenticated: true,
      nickname: user.nickname,
      avatarUrl,
      avatarColor: user.avatarColor,
    };
  } catch (error) {
    logger.warning("MCP 认证异常", error);
    return null;
  }
}
