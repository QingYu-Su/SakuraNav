/**
 * 管理员用户管理 API
 * @description 用户列表、角色更新、用户删除（仅管理员可用）
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/base/auth";
import { getAllUsers, updateUserRole, deleteUser } from "@/lib/services/user-repository";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Admin:Users");

/** 获取所有用户列表 */
export async function GET() {
  try {
    await requireAdminSession();
    const users = getAllUsers();
    return jsonOk({ items: users });
  } catch {
    return jsonError("未授权", 401);
  }
}

/** 更新用户角色（保留接口兼容） */
export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = (await request.json()) as { id?: string; role?: string };
    if (!body.id || !body.role) {
      return jsonError("缺少参数", 400);
    }
    updateUserRole(body.id, body.role);
    logger.info("用户角色已更新", { userId: body.id, role: body.role });
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}

/** 删除用户 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdminSession();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return jsonError("缺少用户 ID", 400);
    }
    deleteUser(id);
    logger.info("用户已删除", { userId: id });
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
