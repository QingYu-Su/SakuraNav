/**
 * @description 认证模块 - 处理用户会话、JWT 令牌的创建与验证（多用户版本）
 * 管理员账户存储在 users 表中（id = ADMIN_USER_ID），与其他用户统一认证
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import { serverConfig } from "@/lib/config/server-config";
import { SessionUser, UserRole, ADMIN_USER_ID } from "@/lib/base/types";
import { getUserById, verifyPassword, getAdminWithHash } from "@/lib/services/user-repository";
import { getAsset } from "@/lib/services/asset-repository";
import { getApiTokenByHash, updateTokenLastUsed } from "@/lib/services/token-repository";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("Auth");

/** 从 app_settings 读取管理员扩展资料 */
async function getAdminExtendedProfile() {
  try {
    const db = await getDb();
    const rows = await db.query<{ key: string; value: string }>("SELECT key, value FROM app_settings WHERE key IN ('admin_nickname', 'admin_avatar_asset_id')");
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

/** 会话 Cookie 名称 */
export const SESSION_COOKIE_NAME = "sakura-nav-session";

function getSecret() {
  return new TextEncoder().encode(serverConfig.sessionSecret);
}

export async function createSessionToken(username: string, userId: string, role: UserRole) {
  return new SignJWT({ username, userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${serverConfig.rememberDays}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as { username?: string; userId?: string; role?: string; iat?: number };
}

async function getTokensValidAfter(userId: string): Promise<number> {
  try {
    const db = await getDb();
    const row = await db.queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", [`tokens_valid_after:${userId}`]);
    return row ? parseInt(row.value, 10) : 0;
  } catch {
    return 0;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);
    if (!payload.username || !payload.userId) return null;

    if (payload.iat) {
      const validAfter = await getTokensValidAfter(payload.userId);
      if (validAfter > 0 && payload.iat < validAfter) {
        logger.warning("Token 已被吊销", { userId: payload.userId });
        return null;
      }
    }

    if (payload.userId === ADMIN_USER_ID) {
      const admin = await getAdminExtendedProfile();
      return { username: payload.username, userId: ADMIN_USER_ID, role: "admin", isAuthenticated: true, nickname: admin.nickname, avatarUrl: admin.avatarUrl, avatarColor: null };
    }

    const user = await getUserById(payload.userId);
    if (!user) { logger.warning("注册用户会话验证失败: 用户不存在", { userId: payload.userId }); return null; }

    let avatarUrl: string | null = null;
    if (user.avatarAssetId) {
      const asset = await getAsset(user.avatarAssetId);
      if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
    }

    return { username: user.username, userId: user.id, role: user.role, isAuthenticated: true, nickname: user.nickname, avatarUrl, avatarColor: user.avatarColor };
  } catch (error) {
    logger.warning("会话验证失败", error);
    return null;
  }
}

export async function setSessionCookie(username: string, userId: string, role: UserRole, rememberMe = true) {
  const token = await createSessionToken(username, userId, role);
  const cookieStore = await cookies();
  const maxAge = rememberMe ? serverConfig.rememberDays * 24 * 60 * 60 : undefined;
  cookieStore.set(SESSION_COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge });
  logger.info("会话已创建", { username, userId, role, rememberMe });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  cookieStore.set("csrf_token", "", { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  logger.info("会话已清除");
}

export async function requireAdminSession() {
  const session = await getSession();
  if (!session?.isAuthenticated || session.role !== "admin") { logger.warning("管理员权限验证失败: 未授权访问"); throw new Error("UNAUTHORIZED"); }
  return session;
}

export const requirePrivilegedSession = requireAdminSession;

export async function requireUserSession() {
  // 先尝试 Bearer Token 认证
  const tokenSession = await getApiTokenSession();
  if (tokenSession) return tokenSession;

  // 回退到 Cookie 会话
  const session = await getSession();
  if (!session?.isAuthenticated) { logger.warning("用户权限验证失败: 未授权访问"); throw new Error("UNAUTHORIZED"); }
  return session;
}

/** 通过 Bearer Token 获取会话（仅用于 API 调用认证） */
async function getApiTokenSession(): Promise<SessionUser | null> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    const rawToken = authHeader.slice(7).trim();
    if (!rawToken.startsWith("sak_")) return null;

    const hash = createHash("sha256").update(rawToken).digest("hex");
    const apiToken = await getApiTokenByHash(hash);
    if (!apiToken) {
      logger.warning("API Token 验证失败: 令牌不存在", { prefix: rawToken.slice(0, 8) });
      return null;
    }

    // 检查过期
    if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
      logger.warning("API Token 已过期", { tokenId: apiToken.id });
      return null;
    }

    // 检查用户是否被吊销
    const validAfter = await getTokensValidAfter(apiToken.userId);
    const tokenCreated = new Date(apiToken.createdAt).getTime() / 1000;
    if (validAfter > 0 && tokenCreated < validAfter) {
      logger.warning("API Token 已被吊销", { tokenId: apiToken.id });
      return null;
    }

    // 获取用户信息
    if (apiToken.userId === ADMIN_USER_ID) {
      const admin = await getAdminExtendedProfile();
      // 异步更新最后使用时间（不阻塞）
      updateTokenLastUsed(apiToken.id).catch(() => {});
      return { username: "admin", userId: ADMIN_USER_ID, role: "admin", isAuthenticated: true, nickname: admin.nickname, avatarUrl: admin.avatarUrl, avatarColor: null };
    }

    const user = await getUserById(apiToken.userId);
    if (!user) {
      logger.warning("API Token 用户不存在", { userId: apiToken.userId });
      return null;
    }

    let avatarUrl: string | null = null;
    if (user.avatarAssetId) {
      const asset = await getAsset(user.avatarAssetId);
      if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
    }

    // 异步更新最后使用时间（不阻塞）
    updateTokenLastUsed(apiToken.id).catch(() => {});

    return { username: user.username, userId: user.id, role: user.role, isAuthenticated: true, nickname: user.nickname, avatarUrl, avatarColor: user.avatarColor };
  } catch (error) {
    logger.warning("Bearer Token 认证异常", error);
    return null;
  }
}

/**
 * 获取可选会话（同时支持 Cookie 和 Bearer Token）
 * 用于公开路由（如 navigation），Token 认证后返回用户自有数据
 */
export async function getOptionalSession(): Promise<SessionUser | null> {
  const tokenSession = await getApiTokenSession();
  if (tokenSession) return tokenSession;
  return getSession();
}

export async function requireAdminConfirmation(password: string | null | undefined) {
  await requireAdminSession();
  if (!password) { logger.warning("管理员二次确认失败: 未提供密码"); throw new Error("INVALID_PASSWORD"); }
  const admin = await getAdminWithHash();
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) { logger.warning("管理员二次确认失败: 密码错误"); throw new Error("INVALID_PASSWORD"); }
  logger.info("管理员二次确认成功");
}

export function getEffectiveOwnerId(session: { userId: string; role: UserRole }): string {
  return session.role === "admin" ? ADMIN_USER_ID : session.userId;
}
