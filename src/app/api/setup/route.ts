/**
 * 管理员初始化 API
 * @description 首次启动时创建管理员账户
 */

import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/base/auth";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { isAdminInitialized, initializeAdmin, isUsernameTaken } from "@/lib/services/user-repository";
import { setupInputSchema } from "@/lib/config/schemas";
import { jsonError } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Setup");

/** 检查是否需要初始化 */
export async function GET() {
  try {
    const initialized = isAdminInitialized();
    return NextResponse.json({ initialized });
  } catch {
    // 数据库未就绪时也需要初始化
    return NextResponse.json({ initialized: false });
  }
}

/** 创建管理员账户 */
export async function POST(request: NextRequest) {
  // 安全检查：已初始化则拒绝
  if (isAdminInitialized()) {
    return jsonError("管理员账户已存在", 403);
  }

  const body = await request.json();
  const parsed = setupInputSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "参数校验失败";
    return jsonError(firstError, 400);
  }

  const { username, password } = parsed.data;

  if (isUsernameTaken(username)) {
    return jsonError("该用户名已被注册", 409);
  }

  const user = initializeAdmin(username, password);
  logger.info("管理员账户初始化成功", { username });

  // 自动登录：创建会话 token
  const token = await createSessionToken(user.username, ADMIN_USER_ID, "admin");
  const response = NextResponse.json({ ok: true, username: user.username });
  response.cookies.set("sakura-nav-session", token, {
    httpOnly: true, sameSite: "lax", secure: false, path: "/",
  });
  return response;
}
