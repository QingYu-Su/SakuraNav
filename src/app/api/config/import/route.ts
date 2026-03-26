import JSZip from "jszip";
import { requireAdminConfirmation } from "@/lib/auth";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
  replaceConfigArchive,
} from "@/lib/db";
import { configArchiveSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const password = formData.get("password");

    await requireAdminConfirmation(typeof password === "string" ? password : null);

    if (!(file instanceof File)) {
      return jsonError("请先选择配置压缩包");
    }

    const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
    const configEntry = zip.file("config.json");

    if (!configEntry) {
      return jsonError("压缩包中缺少 config.json");
    }

    const parsed = configArchiveSchema.safeParse(
      JSON.parse(await configEntry.async("string")),
    );

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "配置包格式不合法");
    }

    const assetFiles = new Map<string, Buffer>();
    for (const asset of parsed.data.assets) {
      const zipEntry = zip.file(asset.archivePath);
      if (!zipEntry) {
        return jsonError(`压缩包缺少资源文件：${asset.archivePath}`);
      }

      assetFiles.set(asset.id, Buffer.from(await zipEntry.async("uint8array")));
    }

    replaceConfigArchive(parsed.data, assetFiles);

    return jsonOk({
      ok: true,
      tags: getVisibleTags(true),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(),
      settings: getAppSettings(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    if (error instanceof Error && error.message === "INVALID_PASSWORD") {
      return jsonError("确认密码错误", 403);
    }

    return jsonError(error instanceof Error ? error.message : "导入失败", 500);
  }
}
