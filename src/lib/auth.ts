import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { serverConfig } from "@/lib/server-config";
import { SessionUser } from "@/lib/types";

const SESSION_COOKIE = "sakura-nav-session";

function getSecret() {
  return new TextEncoder().encode(serverConfig.sessionSecret);
}

export async function createSessionToken(username: string) {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${serverConfig.rememberDays}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as { username?: string };
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);

    if (payload.username !== serverConfig.adminUsername) {
      return null;
    }

    return {
      username: serverConfig.adminUsername,
      isAuthenticated: true,
    };
  } catch {
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
}

export async function requireAdminSession() {
  const session = await getSession();
  if (!session?.isAuthenticated) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdminConfirmation(password: string | null | undefined) {
  await requireAdminSession();

  if (!password || password !== serverConfig.adminPassword) {
    throw new Error("INVALID_PASSWORD");
  }
}
