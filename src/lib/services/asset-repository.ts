/**
 * @description 资源数据仓库 - 管理上传资源（图片等）的数据库操作
 */

import type { StoredAsset } from "@/lib/base/types";
import { getDb } from "@/lib/database";

/** 存储资源数据库行类型 */
type StoredAssetRow = {
  id: string;
  kind: string;
  file_path: string;
  mime_type: string;
  original_name: string | null;
  note_id: string | null;
  file_size: number | null;
  created_at: string;
};

/** 将数据库行映射为 StoredAsset 对象 */
function mapRow(row: StoredAssetRow): StoredAsset {
  return {
    id: row.id,
    kind: row.kind,
    filePath: row.file_path,
    mimeType: row.mime_type,
    originalName: row.original_name,
    noteId: row.note_id,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export async function createAsset(input: {
  filePath: string;
  mimeType: string;
  kind: string;
  /** 原始文件名 */
  originalName?: string;
  /** 关联的笔记 ID */
  noteId?: string;
  /** 文件大小（字节） */
  fileSize?: number;
}): Promise<{ id: string; kind: string; url: string }> {
  const db = await getDb();
  const id = `asset-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  await db.execute(
    `INSERT INTO assets (id, kind, file_path, mime_type, original_name, note_id, file_size, created_at)
     VALUES (@id, @kind, @filePath, @mimeType, @originalName, @noteId, @fileSize, @createdAt)`,
    {
      id,
      kind: input.kind,
      filePath: input.filePath,
      mimeType: input.mimeType,
      originalName: input.originalName ?? null,
      noteId: input.noteId ?? null,
      fileSize: input.fileSize ?? null,
      createdAt,
    }
  );

  return {
    id,
    kind: input.kind,
    url: `/api/assets/${id}/file`,
  };
}

export async function getAsset(assetId: string): Promise<StoredAsset | null> {
  const db = await getDb();
  const row = await db.queryOne<StoredAssetRow>(
    "SELECT id, kind, file_path, mime_type, original_name, note_id, file_size, created_at FROM assets WHERE id = ?",
    [assetId]
  );

  if (!row) return null;
  return mapRow(row);
}

export async function listStoredAssets(): Promise<StoredAsset[]> {
  const db = await getDb();
  const rows = await db.query<StoredAssetRow>(
    `SELECT id, kind, file_path, mime_type, original_name, note_id, file_size, created_at
     FROM assets ORDER BY created_at ASC, id ASC`
  );

  return rows.map(mapRow);
}

/**
 * 删除资源
 * @param id 资源 ID
 */
export async function deleteAsset(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM assets WHERE id = ?", [id]);
}

/**
 * 获取指定 kind 的所有资源
 */
export async function getAssetsByKind(kind: string): Promise<StoredAsset[]> {
  const db = await getDb();
  const rows = await db.query<StoredAssetRow>(
    `SELECT id, kind, file_path, mime_type, original_name, note_id, file_size, created_at
     FROM assets WHERE kind = ?
     ORDER BY created_at ASC, id ASC`,
    [kind]
  );

  return rows.map(mapRow);
}

/**
 * 获取指定笔记的所有附件（kind = 'note-attachment'）
 */
export async function getNoteAttachments(noteId: string): Promise<StoredAsset[]> {
  const db = await getDb();
  const rows = await db.query<StoredAssetRow>(
    `SELECT id, kind, file_path, mime_type, original_name, note_id, file_size, created_at
     FROM assets WHERE note_id = ? AND kind = 'note-attachment'
     ORDER BY created_at ASC, id ASC`,
    [noteId]
  );

  return rows.map(mapRow);
}

/**
 * 重命名附件的原始文件名
 */
export async function renameAssetOriginalName(id: string, newName: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE assets SET original_name = ? WHERE id = ?", [newName, id]);
}

/**
 * 批量关联资源与笔记（新笔记创建后，将临时上传的附件绑定到笔记 ID）
 */
export async function associateAssetsWithNote(assetIds: string[], noteId: string): Promise<void> {
  if (assetIds.length === 0) return;
  const db = await getDb();
  await db.transaction(async () => {
    for (const id of assetIds) {
      await db.execute("UPDATE assets SET note_id = ? WHERE id = ?", [noteId, id]);
    }
  });
}

/**
 * 获取指定笔记的所有附件资源（用于笔记删除时清理文件）
 * 返回附件列表以便物理删除
 */
export async function getAssetsByNoteId(noteId: string): Promise<StoredAsset[]> {
  const db = await getDb();
  const rows = await db.query<StoredAssetRow>(
    `SELECT id, kind, file_path, mime_type, original_name, note_id, file_size, created_at
     FROM assets WHERE note_id = ?
     ORDER BY created_at ASC, id ASC`,
    [noteId]
  );

  return rows.map(mapRow);
}

/**
 * 删除指定笔记的所有附件资源（数据库记录）
 */
export async function deleteAssetsByNoteId(noteId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM assets WHERE note_id = ?", [noteId]);
}

/**
 * 批量解除资源与笔记的关联（软删除：保留文件和数据库记录，仅将 note_id 置空）
 * 用于编辑保存时标记删除的附件，支持撤销恢复
 */
export async function unlinkAssetsFromNote(assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) return;
  const db = await getDb();
  await db.transaction(async () => {
    for (const id of assetIds) {
      await db.execute("UPDATE assets SET note_id = NULL WHERE id = ?", [id]);
    }
  });
}

/**
 * 查找笔记附件中未被任何笔记卡片引用的孤立资源
 * 同时覆盖 note-image、note-file 和 note-attachment 三种类型
 * - note-image / note-file：通过内容引用判断
 * - note-attachment：通过 note_id 关联判断（note 存在即为有效）
 * @param referencedAssetIds 当前所有笔记内容中引用的 asset ID 集合
 * @returns 被清理的 asset 列表（含 filePath 用于物理删除）
 */
export async function findOrphanNoteAssets(referencedAssetIds: Set<string>): Promise<StoredAsset[]> {
  const noteImages = await getAssetsByKind("note-image");
  const noteFiles = await getAssetsByKind("note-file");
  // note-image 和 note-file：未在内容中引用即为孤立
  const inlineOrphans = [...noteImages, ...noteFiles].filter(
    (asset) => !referencedAssetIds.has(asset.id)
  );

  // note-attachment：note_id 为空或关联的笔记已被删除即为孤立
  const noteAttachments = await getAssetsByKind("note-attachment");
  const db = await getDb();
  const attachmentOrphans: StoredAsset[] = [];
  for (const asset of noteAttachments) {
    if (!asset.noteId) {
      attachmentOrphans.push(asset);
      continue;
    }
    const exists = await db.queryOne("SELECT 1 FROM cards WHERE id = ?", [asset.noteId]);
    if (!exists) {
      attachmentOrphans.push(asset);
    }
  }

  return [...inlineOrphans, ...attachmentOrphans];
}
