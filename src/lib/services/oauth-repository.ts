/**
 * @description OAuth 数据仓库 - 管理第三方登录账号的绑定/解绑/查询
 */

import type { OAuthProvider, OAuthAccount, OAuthBindingInfo } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("OAuthRepository");

/** OAuth 账号数据库行类型 */
type OAuthAccountRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  profile_data: string | null;
  created_at: string;
  updated_at: string;
};

function mapOAuthAccountRow(row: OAuthAccountRow): OAuthAccount {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider as OAuthProvider,
    providerAccountId: row.provider_account_id,
    profileData: row.profile_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 根据 provider + providerAccountId 查找 OAuth 账号
 */
export function getOAuthAccount(provider: string, providerAccountId: string): OAuthAccount | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?")
    .get(provider, providerAccountId) as OAuthAccountRow | undefined;
  return row ? mapOAuthAccountRow(row) : null;
}

/**
 * 获取用户绑定的所有 OAuth 账号
 */
export function getOAuthAccountsByUserId(userId: string): OAuthAccount[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM oauth_accounts WHERE user_id = ? ORDER BY created_at ASC")
    .all(userId) as OAuthAccountRow[];
  return rows.map(mapOAuthAccountRow);
}

/**
 * 获取用户绑定的 OAuth 账号脱敏信息（前端展示用）
 */
export function getOAuthBindingsByUserId(userId: string): OAuthBindingInfo[] {
  const accounts = getOAuthAccountsByUserId(userId);
  return accounts.map((account) => {
    let displayName: string | null = null;
    let avatarUrl: string | null = null;
    if (account.profileData) {
      try {
        const data = JSON.parse(account.profileData) as Record<string, string>;
        displayName = data.displayName ?? data.name ?? data.login ?? null;
        avatarUrl = data.avatarUrl ?? data.avatar_url ?? null;
      } catch { /* ignore */ }
    }
    return {
      provider: account.provider,
      displayName,
      avatarUrl,
      boundAt: account.createdAt,
    };
  });
}

/**
 * 创建 OAuth 账号绑定
 */
export function createOAuthAccount(input: {
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  profileData?: Record<string, string> | null;
}): OAuthAccount {
  const db = getDb();
  const id = `oauth-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const profileJson = input.profileData ? JSON.stringify(input.profileData) : null;

  db.prepare(
    "INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, profile_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, input.userId, input.provider, input.providerAccountId, profileJson, now, now);

  logger.info("OAuth 账号绑定已创建", { provider: input.provider, userId: input.userId });
  return {
    id,
    userId: input.userId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    profileData: profileJson,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 删除 OAuth 账号绑定
 */
export function deleteOAuthAccount(userId: string, provider: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?")
    .run(userId, provider);
  if (result.changes > 0) {
    logger.info("OAuth 账号已解绑", { provider, userId });
    return true;
  }
  return false;
}

/**
 * 删除用户的所有 OAuth 绑定（用户注销时调用）
 */
export function deleteOAuthAccountsByUserId(userId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM oauth_accounts WHERE user_id = ?").run(userId);
  logger.info("用户 OAuth 绑定已全部清除", { userId });
}

/**
 * 获取用户绑定的 OAuth 供应商数量
 */
export function getOAuthAccountCount(userId: string): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM oauth_accounts WHERE user_id = ?").get(userId) as { count: number };
  return row.count;
}
