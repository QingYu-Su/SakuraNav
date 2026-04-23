/**
 * 用户头像 API
 * POST - 上传/更新用户头像（FormData 文件上传或 JSON URL 上传）
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

/** 上传目录 */
const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
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

    const contentType = request.headers.get("content-type") ?? "";

    let filePath: string;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      // 文件上传
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return jsonError("请选择图片文件", 400);
      }

      if (file.size > 5 * 1024 * 1024) {
        return jsonError("图片大小不能超过 5MB", 400);
      }

      mimeType = file.type || "image/png";
      const ext = mimeType.split("/")[1] || "png";
      const fileName = `avatar-${randomUUID()}.${ext}`;

      await ensureUploadDir();
      filePath = path.join(UPLOAD_DIR, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
    } else {
      // URL 上传
      const body = (await request.json()) as { sourceUrl?: string };
      if (!body.sourceUrl) {
        return jsonError("请提供图片 URL", 400);
      }

      try {
        const response = await fetch(body.sourceUrl, {
          headers: { "User-Agent": "SakuraNav/1.0" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        mimeType = response.headers.get("content-type") || "image/png";
        if (!mimeType.startsWith("image/")) {
          return jsonError("URL 返回的内容不是图片", 400);
        }

        const ext = mimeType.split("/")[1] || "png";
        const fileName = `avatar-${randomUUID()}.${ext}`;
        await ensureUploadDir();
        filePath = path.join(UPLOAD_DIR, fileName);
        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(filePath, buffer);
      } catch {
        return jsonError("图片下载失败，请检查 URL 是否正确", 400);
      }
    }

    const relativePath = path.relative(process.cwd(), filePath);
    const asset = createAsset({ filePath: relativePath, mimeType, kind: "avatar" });

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
