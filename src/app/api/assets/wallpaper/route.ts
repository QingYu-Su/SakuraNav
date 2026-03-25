import fs from "node:fs/promises";
import path from "node:path";
import { requireAdminSession } from "@/lib/auth";
import { createAsset } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("请上传壁纸文件");
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
      kind: "wallpaper",
    });

    return jsonOk(asset);
  } catch {
    return jsonError("未授权", 401);
  }
}
