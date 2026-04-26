/**
 * 注销账号 API 路由
 * @description 彻底删除当前用户的所有数据（标签、站点、外观、资源文件）并删除用户记录。
 * 仅限注册用户（role=user），管理员不允许注销。
 */

import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession, clearSessionCookie } from "@/lib/base/auth";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { deleteUser } from "@/lib/services/user-repository";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:User:DeleteAccount");

export async function POST() {
  try {
    const session = await requireUserSession();

    // 管理员不允许注销账号
    if (session.userId === ADMIN_USER_ID || session.role === "admin") {
      return jsonError("管理员账号不支持注销", 403);
    }

    const userId = session.userId;
    logger.info("开始注销用户账号", { userId, username: session.username });

    // 删除用户所有数据（站点、标签、外观、资源文件、用户记录）
    deleteUser(userId);

    // 清除会话 Cookie
    await clearSessionCookie();

    logger.info("用户账号已注销", { userId });
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("注销账号失败", error);
    return jsonError(error instanceof Error ? error.message : "注销失败", 500);
  }
}
