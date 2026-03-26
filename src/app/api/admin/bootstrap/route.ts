import { requireAdminSession } from "@/lib/auth";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
} from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET() {
  try {
    await requireAdminSession();

    return jsonOk({
      tags: getVisibleTags(true),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(),
      settings: getAppSettings(),
    });
  } catch {
    return jsonError("未授权", 401);
  }
}
