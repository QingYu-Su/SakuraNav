/**
 * 注册 API 路由
 * @description 处理新用户注册，注册后自动复制管理员数据到新用户空间
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { isUsernameTaken, createUser, copyAdminDataToUser } from "@/lib/services/user-repository";
import { getAppSettings } from "@/lib/services";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Auth:Register");

export async function POST(request: NextRequest) {
  // 速率限制
  const ip = getClientIp(request);
  if (isRateLimited(ip, "auth")) {
    return jsonError("请求过于频繁，请稍后再试", 429);
  }

  const settings = getAppSettings();
  if (!settings.registrationEnabled) {
    return jsonError("注册功能已关闭", 403);
  }

  const body = (await request.json()) as {
    username?: string;
    password?: string;
    confirmPassword?: string;
  };

  const { username, password, confirmPassword } = body;

  if (!username || !password || !confirmPassword) {
    return jsonError("请填写所有字段", 400);
  }
  if (username.length < 2 || username.length > 10) {
    return jsonError("用户名长度需在 2-10 个字符之间", 400);
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return jsonError("用户名只能包含字母、数字和下划线", 400);
  }
  if (password.length < 6) {
    return jsonError("密码长度不能少于 6 位", 400);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return jsonError("密码需包含大写字母、小写字母和数字", 400);
  }
  if (password !== confirmPassword) {
    return jsonError("两次输入的密码不一致", 400);
  }
  if (isUsernameTaken(username)) {
    return jsonError("该用户名已被注册", 409);
  }

  const user = createUser(username, password);
  copyAdminDataToUser(user.id);

  logger.info("用户注册成功", { username });
  return jsonOk({ ok: true, username: user.username });
}
