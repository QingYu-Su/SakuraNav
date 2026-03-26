import fs from "node:fs/promises";
import JSZip from "jszip";
import { requireAdminConfirmation } from "@/lib/auth";
import { buildConfigArchive, listStoredAssets } from "@/lib/db";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";

function buildExportFilename() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];

  return `sakuranav-config-${parts.join("")}.zip`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    await requireAdminConfirmation(body?.password);

    const archive = buildConfigArchive();
    const storedAssets = new Map(
      listStoredAssets().map((asset) => [asset.id, asset.filePath]),
    );
    const zip = new JSZip();

    zip.file("config.json", JSON.stringify(archive, null, 2));

    await Promise.all(
      archive.assets.map(async (asset) => {
        const filePath = storedAssets.get(asset.id);
        if (!filePath) {
          throw new Error(`缺少资源文件：${asset.id}`);
        }

        const fileBuffer = await fs.readFile(filePath);
        zip.file(asset.archivePath, fileBuffer);
      }),
    );

    const output = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new Response(Buffer.from(output), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${buildExportFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    if (error instanceof Error && error.message === "INVALID_PASSWORD") {
      return jsonError("确认密码错误", 403);
    }

    return jsonError(error instanceof Error ? error.message : "导出失败", 500);
  }
}
