/**
 * @description API Token 仓库 - 管理访问令牌的 CRUD 操作
 */

import { createHash, randomBytes } from "crypto";
import { getDb } from "@/lib/database";
import type { ApiToken, ApiTokenCreateInput, ApiTokenCreateResult, ApiTokenListItem, ApiTokenExpiresIn } from "@/lib/base/types";
import { MAX_API_TOKENS_PER_USER, ADMIN_USER_ID } from "@/lib/base/types";

/** 将数据库行映射为 ApiToken 对象 */
function mapApiTokenRow(row: Record<string, unknown>): ApiToken {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    tokenSuffix: row.token_suffix as string,
    tokenHash: row.token_hash as string,
    expiresAt: row.expires_at as string | null,
    lastUsedAt: row.last_used_at as string | null,
    createdAt: row.created_at as string,
  };
}

/** 将 ApiToken 转为前端展示项 */
export function toTokenListItem(token: ApiToken): ApiTokenListItem {
  const now = new Date();
  const isExpired = token.expiresAt ? new Date(token.expiresAt) < now : false;
  return {
    id: token.id,
    name: token.name,
    tokenSuffix: token.tokenSuffix,
    expiresAt: token.expiresAt,
    lastUsedAt: token.lastUsedAt,
    createdAt: token.createdAt,
    isExpired,
  };
}

/** 计算过期时间 */
function computeExpiresAt(expiresIn: ApiTokenExpiresIn): string | null {
  if (expiresIn === "never") return null;
  const now = new Date();
  switch (expiresIn) {
    case "30d": now.setDate(now.getDate() + 30); break;
    case "90d": now.setDate(now.getDate() + 90); break;
    case "1y": now.setFullYear(now.getFullYear() + 1); break;
  }
  return now.toISOString();
}

/** 生成令牌明文：sak_ + 64位hex */
function generateTokenValue(): string {
  return "sak_" + randomBytes(32).toString("hex");
}

/** 计算 SHA-256 哈希 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 创建 API Token */
export async function createApiToken(userId: string, input: ApiTokenCreateInput): Promise<ApiTokenCreateResult> {
  const db = await getDb();

  // 检查令牌数量限制（管理员不受限制）
  if (userId !== ADMIN_USER_ID) {
    const countRow = await db.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM api_tokens WHERE user_id = ?",
      [userId]
    );
    if (countRow && countRow.count >= MAX_API_TOKENS_PER_USER) {
      throw new Error("TOKEN_LIMIT_REACHED");
    }
  }

  const rawToken = generateTokenValue();
  const suffix = rawToken.slice(-4);
  const hash = hashToken(rawToken);
  const expiresAt = computeExpiresAt(input.expiresIn);
  const id = `tok-${randomBytes(16).toString("hex")}`;
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO api_tokens (id, user_id, name, token_suffix, token_hash, expires_at, last_used_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    [id, userId, input.name, suffix, hash, expiresAt, now]
  );

  return {
    id,
    name: input.name,
    tokenSuffix: suffix,
    token: rawToken,
    expiresAt,
    createdAt: now,
  };
}

/** 通过 hash 查找 Token（用于认证验证） */
export async function getApiTokenByHash(hash: string): Promise<ApiToken | null> {
  const db = await getDb();
  const row = await db.queryOne(
    "SELECT * FROM api_tokens WHERE token_hash = ?",
    [hash]
  );
  return row ? mapApiTokenRow(row) : null;
}

/** 列出用户所有令牌 */
export async function listApiTokensByUser(userId: string): Promise<ApiTokenListItem[]> {
  const db = await getDb();
  const rows = await db.query(
    "SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows.map((row) => toTokenListItem(mapApiTokenRow(row)));
}

/** 删除令牌 */
export async function deleteApiToken(tokenId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute(
    "DELETE FROM api_tokens WHERE id = ? AND user_id = ?",
    [tokenId, userId]
  );
  return result.changes > 0;
}

/** 删除用户所有令牌 */
export async function deleteApiTokensByUser(userId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM api_tokens WHERE user_id = ?", [userId]);
}

/** 更新令牌最后使用时间 */
export async function updateTokenLastUsed(tokenId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    "UPDATE api_tokens SET last_used_at = ? WHERE id = ?",
    [now, tokenId]
  ).catch(() => { /* 非关键操作，忽略错误 */ });
}
