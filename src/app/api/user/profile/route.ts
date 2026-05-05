/**
 * 用户资料 API
 * GET  - 获取当前用户资料（管理员从 app_settings 读取昵称/头像）
 * PUT  - 更新用户昵称（管理员存入 app_settings）
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { getUserById, updateUserNickname } from "@/lib/services/user-repository";
import { getAsset } from "@/lib/services/asset-repository";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:User:Profile");

/** 从 app_settings 读取管理员扩展资料（昵称、头像） */
async function getAdminProfile() {
  const db = await getDb();
  const rows = await db.query<{ key: string; value: string }>("SELECT key, value FROM app_settings WHERE key IN ('admin_nickname', 'admin_avatar_asset_id')");
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const nickname = map.get("admin_nickname") ?? null;
  const avatarAssetId = map.get("admin_avatar_asset_id") ?? null;
  let avatarUrl: string | null = null;
  if (avatarAssetId) {
    const asset = await getAsset(avatarAssetId);
    if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
  }
  return { nickname, avatarUrl };
}

export async function GET() {
  try {
    const session = await requireUserSession();

    // 管理员从 app_settings 读取扩展资料
    if (session.userId === "__admin__") {
      const { nickname, avatarUrl } = await getAdminProfile();
      return jsonOk({
        id: "__admin__",
        username: session.username,
        nickname,
        avatarUrl,
        role: session.role,
      });
    }

    const user = await getUserById(session.userId);
    if (!user) return jsonError("用户不存在", 404);

    let avatarUrl: string | null = null;
    if (user.avatarAssetId) {
      const asset = await getAsset(user.avatarAssetId);
      if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
    }

    // 读取 OAuth 相关字段（has_password / username_changed）
    const db = await getDb();
    const ext = await db.queryOne<{ has_password: number; username_changed: number }>("SELECT has_password, username_changed FROM users WHERE id = ?", [session.userId]);

    return jsonOk({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl,
      avatarColor: user.avatarColor,
      role: user.role,
      hasPassword: ext ? ext.has_password === 1 : true,
      usernameChanged: ext ? ext.username_changed === 1 : false,
    });
  } catch {
    return jsonError("未授权", 401);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const body = (await request.json()) as { nickname?: string };
    const { nickname } = body;

    if (nickname !== undefined && nickname !== null && nickname.length > 20) {
      return jsonError("昵称长度不能超过 20 个字符", 400);
    }

    // 管理员昵称存入 app_settings
    if (session.userId === "__admin__") {
      const db = await getDb();
      await db.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('admin_nickname', ?)", [nickname || ""]);
      const { avatarUrl } = await getAdminProfile();
      logger.info("管理员昵称已更新", { nickname });
      return jsonOk({
        id: "__admin__",
        username: session.username,
        nickname: nickname || null,
        avatarUrl,
        role: session.role,
      });
    }

    await updateUserNickname(session.userId, nickname || null);

    const user = await getUserById(session.userId);
    logger.info("用户昵称已更新", { userId: session.userId, nickname });

    let avatarUrl: string | null = null;
    if (user?.avatarAssetId) {
      const asset = await getAsset(user.avatarAssetId);
      if (asset) avatarUrl = `/api/assets/${asset.id}/file`;
    }

    // 读取 OAuth 相关字段
    const db2 = await getDb();
    const ext = await db2.queryOne<{ has_password: number; username_changed: number }>("SELECT has_password, username_changed FROM users WHERE id = ?", [session.userId]);

    return jsonOk({
      id: user?.id,
      username: user?.username,
      nickname: user?.nickname,
      avatarUrl,
      avatarColor: user?.avatarColor,
      role: user?.role,
      hasPassword: ext ? ext.has_password === 1 : true,
      usernameChanged: ext ? ext.username_changed === 1 : false,
    });
  } catch {
    return jsonError("未授权", 401);
  }
}
