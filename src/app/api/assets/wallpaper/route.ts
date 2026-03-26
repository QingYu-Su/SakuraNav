import fs from "node:fs/promises";
import path from "node:path";
import { requireAdminSession } from "@/lib/auth";
import { createAsset } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

function assetLabel(kind: string) {
  return kind === "logo" ? "Logo" : "壁纸";
}

function extFromMime(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    case "image/avif":
      return ".avif";
    default:
      return ".bin";
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as
        | { sourceUrl?: string; kind?: string }
        | null;
      const sourceUrl = body?.sourceUrl?.trim();
      const kind = body?.kind?.trim() || "wallpaper";
      const label = assetLabel(kind);

      if (!sourceUrl) {
        return jsonError(`请输入${label} URL`);
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(sourceUrl);
      } catch {
        return jsonError(`请输入合法的${label} URL`);
      }

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return jsonError(`${label} URL 仅支持 http 或 https`);
      }

      const response = await fetch(parsedUrl, { cache: "no-store" });
      if (!response.ok) {
        return jsonError(`下载${label}失败`);
      }

      const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
      if (!mimeType.startsWith("image/")) {
        return jsonError(`${label} URL 必须指向图片资源`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const filePath = path.join(
        process.cwd(),
        "storage",
        "uploads",
        `${crypto.randomUUID()}${extFromMime(mimeType)}`,
      );

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, buffer);

      return jsonOk(
        createAsset({
          filePath,
          mimeType,
          kind,
        }),
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kindValue = formData.get("kind");
    const kind = typeof kindValue === "string" && kindValue.trim() ? kindValue.trim() : "wallpaper";
    const label = assetLabel(kind);

    if (!(file instanceof File)) {
      return jsonError(`请上传${label}文件`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".bin";
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(process.cwd(), "storage", "uploads", filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    const asset = createAsset({
      filePath,
      mimeType: file.type || "application/octet-stream",
      kind,
    });

    return jsonOk(asset);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    return jsonError(error instanceof Error ? error.message : "上传图片失败", 500);
  }
}
