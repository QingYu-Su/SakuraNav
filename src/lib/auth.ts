/**
 * @description 认证模块 - 处理用户会话、JWT 令牌的创建与验证
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { serverConfig } from "@/lib/server-config";
import { SessionUser } from "@/lib/types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Auth");

/** 会话 Cookie 名称 */
const SESSION_COOKIE = "sakura-nav-session";

/**
 * 获取 JWT 签名密钥
 * @returns 编码后的密钥
 */
function getSecret() {
  return new TextEncoder().encode(serverConfig.sessionSecret);
}

/**
 * 创建会话 JWT 令牌
 * @param username 用户名
 * @returns 签名后的 JWT 令牌
 */
export async function createSessionToken(username: string) {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${serverConfig.rememberDays}d`)
    .sign(getSecret());
}

/**
 * 验证会话 JWT 令牌
 * @param token JWT 令牌
 * @returns 解析后的载荷
 */
export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as { username?: string };
}

/**
 * 获取当前会话用户信息
 * @returns 会话用户信息，未登录返回 null
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);

    if (payload.username !== serverConfig.adminUsername) {
      logger.warning("会话验证失败: 用户名不匹配", { username: payload.username });
      return null;
    }

    return {
      username: serverConfig.adminUsername,
      isAuthenticated: true,
    };
  } catch (error) {
    logger.warning("会话验证失败", error);
    return null;
  }
}

export async function setSessionCookie(username: string) {
  const token = await createSessionToken(username);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // 开发模式下设置为 false 以支持局域网 IP 访问
    // 生产模式下必须使用 HTTPS
    secure: false,
    path: "/",
    maxAge: serverConfig.rememberDays * 24 * 60 * 60,
  });
  
  logger.info("会话已创建", { username });
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
  if (!session?.isAuthenticated) {
    logger.warning("管理员权限验证失败: 未授权访问");
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * 要求管理员二次确认密码
 * @param password 管理员密码
 * @throws 密码错误时抛出 "INVALID_PASSWORD" 错误
 */
export async function requireAdminConfirmation(password: string | null | undefined) {
  await requireAdminSession();

  if (!password || password !== serverConfig.adminPassword) {
    logger.warning("管理员二次确认失败: 密码错误");
    throw new Error("INVALID_PASSWORD");
  }
  
  logger.info("管理员二次确认成功");
}
