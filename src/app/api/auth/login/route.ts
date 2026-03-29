import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { serverConfig } from "@/lib/server-config";
import { jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (
    body.username !== serverConfig.adminUsername ||
    body.password !== serverConfig.adminPassword
  ) {
    return jsonError("账号或密码错误", 401);
  }

  const token = await createSessionToken(serverConfig.adminUsername);

  const response = NextResponse.json({
    ok: true,
    username: serverConfig.adminUsername,
  });

  // 显式设置 Set-Cookie 头
  response.cookies.set("sakura-nav-session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // 开发环境支持 HTTP
    path: "/",
    maxAge: serverConfig.rememberDays * 24 * 60 * 60,
  });

  return response;
}
