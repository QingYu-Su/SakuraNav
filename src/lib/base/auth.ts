/**
 * @description 认证模块 - 处理用户会话、JWT 令牌的创建与验证（多用户版本）
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { serverConfig } from "@/lib/config/server-config";
import { SessionUser, UserRole, ADMIN_USER_ID } from "@/lib/base/types";
import { getUserByUsernameWithHash } from "@/lib/services/user-repository";
import { getAsset } from "@/lib/services/asset-repository";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("Auth");

/** 从 app_settings 读取管理员扩展资料 */
function getAdminExtendedProfile() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('admin_nickname', 'admin_avatar_asset_id')").all() as Array<{ key: string; value: string }>;
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const nickname = map.get("admin_nickname") || null;
    const avatarAssetId = map.get("admin_avatar_asset_id") ?? null;
    let avatarUrl: string | null = null;
    if (avatarAssetId) {
      const asset = getAsset(avatarAssetId);
      if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
    }
    return { nickname, avatarUrl };
  } catch {
    return { nickname: null, avatarUrl: null };
  }
}

/** 会话 Cookie 名称 */
const SESSION_COOKIE = "sakura-nav-session";

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
  return payload as { username?: string; userId?: string; role?: string };
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);
    if (!payload.username) {
      return null;
    }

    // 兼容旧版会话令牌（仅含 username，不含 userId/role）
    if (!payload.userId) {
      if (payload.username === serverConfig.adminUsername) {
        const admin = getAdminExtendedProfile();
        return {
          username: serverConfig.adminUsername,
          userId: ADMIN_USER_ID,
          role: "admin",
          isAuthenticated: true,
          nickname: admin.nickname,
          avatarUrl: admin.avatarUrl,
          avatarColor: null,
        };
      }
      return null;
    }

    // 管理员用户
    if (payload.userId === ADMIN_USER_ID) {
      if (payload.username !== serverConfig.adminUsername) {
        logger.warning("管理员会话验证失败: 用户名不匹配", { username: payload.username });
        return null;
      }
      const admin = getAdminExtendedProfile();
      return {
        username: serverConfig.adminUsername,
        userId: ADMIN_USER_ID,
        role: "admin",
        isAuthenticated: true,
        nickname: admin.nickname,
        avatarUrl: admin.avatarUrl,
        avatarColor: null,
      };
    }

    // 注册用户：从数据库验证
    const user = getUserByUsernameWithHash(payload.username);
    if (!user || user.id !== payload.userId) {
      logger.warning("注册用户会话验证失败: 用户不存在或 ID 不匹配", { username: payload.username });
      return null;
    }

    // 获取头像 URL
    let avatarUrl: string | null = null;
    if (user.avatarAssetId) {
      const asset = getAsset(user.avatarAssetId);
      if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
    }

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
    logger.warning("会话验证失败", error);
    return null;
  }
}

export async function setSessionCookie(username: string, userId: string, role: UserRole, rememberMe = true) {
  const token = await createSessionToken(username, userId, role);
  const cookieStore = await cookies();
  const maxAge = rememberMe ? serverConfig.rememberDays * 24 * 60 * 60 : undefined;
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge,
  });
  logger.info("会话已创建", { username, userId, role, rememberMe });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  logger.info("会话已清除");
}

export async function requireAdminSession() {
  const session = await getSession();
  if (!session?.isAuthenticated || session.role !== "admin") {
    logger.warning("管理员权限验证失败: 未授权访问");
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireUserSession() {
  const session = await getSession();
  if (!session?.isAuthenticated) {
    logger.warning("用户权限验证失败: 未授权访问");
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdminConfirmation(password: string | null | undefined) {
  await requireAdminSession();
  if (!password || password !== serverConfig.adminPassword) {
    logger.warning("管理员二次确认失败: 密码错误");
    throw new Error("INVALID_PASSWORD");
  }
  logger.info("管理员二次确认成功");
}

/**
 * 获取外观/数据操作的有效 ownerId
 * - 管理员 → 使用 ADMIN_USER_ID（即 __admin__），修改直接影响游客
 * - 普通用户 → 使用自身 userId，修改仅影响自己
 */
export function getEffectiveOwnerId(session: { userId: string; role: UserRole }): string {
  return session.role === "admin" ? ADMIN_USER_ID : session.userId;
}
