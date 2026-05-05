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
export async function getOAuthAccount(
  provider: string,
  providerAccountId: string,
): Promise<OAuthAccount | null> {
  const db = await getDb();
  const row = await db.queryOne<OAuthAccountRow>(
    "SELECT * FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?",
    [provider, providerAccountId],
  );
  return row ? mapOAuthAccountRow(row) : null;
}

/**
 * 获取用户绑定的所有 OAuth 账号
 */
export async function getOAuthAccountsByUserId(userId: string): Promise<OAuthAccount[]> {
  const db = await getDb();
  const rows = await db.query<OAuthAccountRow>(
    "SELECT * FROM oauth_accounts WHERE user_id = ? ORDER BY created_at ASC",
    [userId],
  );
  return rows.map(mapOAuthAccountRow);
}

/**
 * 获取用户绑定的 OAuth 账号脱敏信息（前端展示用）
 */
export async function getOAuthBindingsByUserId(userId: string): Promise<OAuthBindingInfo[]> {
  const accounts = await getOAuthAccountsByUserId(userId);
  return accounts.map((account) => {
    let displayName: string | null = null;
    let avatarUrl: string | null = null;
    if (account.profileData) {
      try {
        const data = JSON.parse(account.profileData) as Record<string, string>;
        displayName = data.displayName ?? data.name ?? data.login ?? null;
        avatarUrl = data.avatarUrl ?? data.avatar_url ?? null;
      } catch {
        /* ignore */
      }
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
export async function createOAuthAccount(input: {
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  profileData?: Record<string, string> | null;
}): Promise<OAuthAccount> {
  const db = await getDb();
  const id = `oauth-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const profileJson = input.profileData ? JSON.stringify(input.profileData) : null;

  await db.execute(
    "INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, profile_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, input.userId, input.provider, input.providerAccountId, profileJson, now, now],
  );

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
export async function deleteOAuthAccount(userId: string, provider: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute(
    "DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?",
    [userId, provider],
  );
  if (result.changes > 0) {
    logger.info("OAuth 账号已解绑", { provider, userId });
    return true;
  }
  return false;
}

/**
 * 删除用户的所有 OAuth 绑定（用户注销时调用）
 */
export async function deleteOAuthAccountsByUserId(userId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM oauth_accounts WHERE user_id = ?", [userId]);
  logger.info("用户 OAuth 绑定已全部清除", { userId });
}

/**
 * 获取用户绑定的 OAuth 供应商数量
 */
export async function getOAuthAccountCount(userId: string): Promise<number> {
  const db = await getDb();
  const row = await db.queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM oauth_accounts WHERE user_id = ?",
    [userId],
  );
  return row!.count;
}
