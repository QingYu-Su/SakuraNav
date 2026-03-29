import type { StoredAsset } from "@/lib/types";
import { getDb } from "@/lib/core/database";

type StoredAssetRow = {
  id: string;
  kind: string;
  file_path: string;
  mime_type: string;
  created_at: string;
};

export function createAsset(input: {
  filePath: string;
  mimeType: string;
  kind: string;
}): { id: string; kind: string; url: string } {
  const db = getDb();
  const id = `asset-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO assets (id, kind, file_path, mime_type, created_at)
    VALUES (@id, @kind, @filePath, @mimeType, @createdAt)
  `
  ).run({
    id,
    kind: input.kind,
    filePath: input.filePath,
    mimeType: input.mimeType,
    createdAt,
  });

  return {
    id,
    kind: input.kind,
    url: `/api/assets/${id}/file`,
  };
}

export function getAsset(assetId: string): StoredAsset | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, kind, file_path, mime_type, created_at FROM assets WHERE id = ?"
    )
    .get(assetId) as StoredAssetRow | undefined;

  if (!row) return null;

  return {
    id: row.id,
    kind: row.kind,
    filePath: row.file_path,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  };
}

export function listStoredAssets(): StoredAsset[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, kind, file_path, mime_type, created_at
      FROM assets
      ORDER BY created_at ASC, id ASC
      `
    )
    .all() as StoredAssetRow[];

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    filePath: row.file_path,
    mimeType: row.mime_type,
    createdAt: row.created_at,
  }));
}

export function deleteAsset(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM assets WHERE id = ?").run(id);
}
