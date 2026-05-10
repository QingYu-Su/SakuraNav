/**
* 笔记附件管理 API 路由
* @description 处理笔记大文件附件的上传、列表、重命名和删除
* 与笔记内容内联文件不同，附件通过附件管理标签页独立管理
*/

import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { createAsset, getNoteAttachments, renameAssetOriginalName, getAsset, deleteAsset } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import type { NoteAttachment } from "@/lib/base/types";

const logger = createLogger("API:NoteCards:Attachment");

export const runtime = "nodejs";

/** 最大附件大小：100MB */
const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;

/** 危险文件扩展名黑名单 */
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "scr", "msi", "msp", "cpl",
  "sh", "bash", "ps1", "vbs", "vbe", "wsf", "wsh",
  "jar", "class", "app", "dll", "sys",
]);

/** 将 StoredAsset 映射为前端展示类型 */
function toAttachmentView(asset: Awaited<ReturnType<typeof getAsset>>): NoteAttachment | null {
  if (!asset) return null;
  return {
    id: asset.id,
    filename: asset.originalName || "未命名文件",
    size: asset.fileSize ?? 0,
    mimeType: asset.mimeType,
    url: `/api/note-cards/attach/${asset.id}`,
    createdAt: asset.createdAt,
  };
}

/** GET — 获取指定笔记的附件列表 */
export async function GET(request: NextRequest) {
  try {
    await requireUserSession();
    const noteId = request.nextUrl.searchParams.get("noteId");

    if (!noteId) {
      return jsonError("缺少 noteId 参数");
    }

    const assets = await getNoteAttachments(noteId);
    const items = assets.map((a) => toAttachmentView(a)).filter((x): x is NoteAttachment => x != null);
    return jsonOk({ items });
  } catch {
    return jsonError("未授权", 401);
  }
}

/** POST — 上传附件 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const ownerId = session.userId === "__admin__" ? "__admin__" : session.userId;

    const formData = await request.formData();
    const file = formData.get("file");
    const noteId = (formData.get("noteId") as string) || undefined;

    if (!(file instanceof File)) {
      return jsonError("请上传文件");
    }

    // 校验文件扩展名
    const ext = path.extname(file.name).toLowerCase().replace(".", "");
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return jsonError("不支持上传该类型的文件");
    }

    // 校验文件大小
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return jsonError("文件大小不能超过 100MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeExt = ext || "bin";
    const filename = `${crypto.randomUUID()}.${safeExt}`;
    const userUploadsDir = path.join(process.env.PROJECT_ROOT ?? process.cwd(), "storage", "uploads", ownerId);
    const filePath = path.join(userUploadsDir, filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    const asset = await createAsset({
      filePath,
      mimeType: file.type || "application/octet-stream",
      kind: "note-attachment",
      originalName: file.name,
      noteId,
      fileSize: buffer.length,
    });

    const attachmentUrl = `/api/note-cards/attach/${asset.id}`;
    logger.info("笔记附件上传成功", { assetId: asset.id, filename: file.name, size: buffer.length });

    return jsonOk({
      item: {
        id: asset.id,
        filename: file.name,
        size: buffer.length,
        mimeType: file.type || "application/octet-stream",
        url: attachmentUrl,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("笔记附件上传失败", error);
    return jsonError(error instanceof Error ? error.message : "上传失败", 500);
  }
}

/** PUT — 重命名附件 */
export async function PUT(request: NextRequest) {
  try {
    await requireUserSession();
    const body = await request.json();
    const { id, filename } = body as { id?: string; filename?: string };

    if (!id || !filename || !filename.trim()) {
      return jsonError("参数不完整");
    }

    const asset = await getAsset(id);
    if (!asset || asset.kind !== "note-attachment") {
      return jsonError("附件不存在");
    }

    await renameAssetOriginalName(id, filename.trim());
    logger.info("笔记附件重命名", { assetId: id, newName: filename.trim() });
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("笔记附件重命名失败", error);
    return jsonError(error instanceof Error ? error.message : "重命名失败", 500);
  }
}

/** DELETE — 删除附件 */
export async function DELETE(request: NextRequest) {
  try {
    await requireUserSession();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return jsonError("缺少附件 ID");
    }

    const asset = await getAsset(id);
    if (!asset || asset.kind !== "note-attachment") {
      return jsonError("附件不存在");
    }

    // 物理删除文件
    try { await fs.unlink(asset.filePath); } catch { /* 文件可能已不存在 */ }
    // 数据库删除记录
    await deleteAsset(id);
    logger.info("笔记附件删除成功", { assetId: id });
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("笔记附件删除失败", error);
    return jsonError(error instanceof Error ? error.message : "删除失败", 500);
  }
}
