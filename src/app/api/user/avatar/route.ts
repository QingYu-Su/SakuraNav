/**
 * 用户头像 API
 * POST - 上传/更新用户头像（FormData 文件上传）
 * DELETE - 删除用户头像
 * @description 管理员头像存入 app_settings（admin_avatar_asset_id）
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { updateUserAvatar } from "@/lib/services/user-repository";
import { createAsset, deleteAsset, getAsset } from "@/lib/services/asset-repository";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const logger = createLogger("API:User:Avatar");

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/** 获取用户的上传目录 */
function getUserUploadDir(ownerId: string) {
  return path.join(projectRoot, "storage", "uploads", ownerId);
}

async function ensureUserUploadDir(ownerId: string) {
  await mkdir(getUserUploadDir(ownerId), { recursive: true });
}

/** 保存管理员头像 asset_id 到 app_settings */
function setAdminAvatarAssetId(assetId: string | null) {
  const db = getDb();
  if (assetId) {
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('admin_avatar_asset_id', ?)").run(assetId);
  } else {
    db.prepare("DELETE FROM app_settings WHERE key = 'admin_avatar_asset_id'").run();
  }
}

/** 获取管理员头像 asset_id */
function getAdminAvatarAssetId(): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'admin_avatar_asset_id'").get() as { value: string } | undefined;
  return row?.value ?? null;
}

/** 删除旧头像资源 */
async function removeOldAvatar(assetId: string) {
  const oldAsset = getAsset(assetId);
  if (oldAsset) {
    try { await unlink(oldAsset.filePath); } catch { /* 忽略文件不存在 */ }
    deleteAsset(oldAsset.id);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const isAdmin = session.userId === "__admin__";

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return jsonError("请选择图片文件", 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return jsonError("图片大小不能超过 5MB", 400);
    }

    const mimeType = file.type || "image/png";
    const ext = mimeType.split("/")[1] || "png";
    const fileName = `avatar-${randomUUID()}.${ext}`;

    await ensureUserUploadDir(session.userId);
    const filePath = path.join(getUserUploadDir(session.userId), fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // 使用绝对路径存储（与壁纸等其他资源保持一致）
    const asset = createAsset({ filePath, mimeType, kind: "avatar" });

    if (isAdmin) {
      // 管理员：删除旧头像，存入 app_settings
      const oldAssetId = getAdminAvatarAssetId();
      if (oldAssetId) await removeOldAvatar(oldAssetId);
      setAdminAvatarAssetId(asset.id);
    } else {
      // 注册用户：更新 users 表
      updateUserAvatar(session.userId, asset.id);
    }

    logger.info("用户头像已上传", { userId: session.userId, assetId: asset.id });

    return jsonOk({ id: asset.id, url: asset.url });
  } catch {
    return jsonError("未授权", 401);
  }
}

export async function DELETE() {
  try {
    const session = await requireUserSession();
    const isAdmin = session.userId === "__admin__";

    if (isAdmin) {
      const oldAssetId = getAdminAvatarAssetId();
      if (oldAssetId) {
        await removeOldAvatar(oldAssetId);
        setAdminAvatarAssetId(null);
      }
      logger.info("管理员头像已删除");
      return jsonOk({ ok: true });
    }

    // 注册用户
    const userProfile = await import("@/lib/services/user-repository").then((m) => m.getUserById(session.userId));
    if (userProfile?.avatarAssetId) {
      await removeOldAvatar(userProfile.avatarAssetId);
    }

    updateUserAvatar(session.userId, null);
    logger.info("用户头像已删除", { userId: session.userId });

    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
