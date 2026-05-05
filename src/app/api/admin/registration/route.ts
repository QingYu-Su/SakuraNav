/**
 * 注册开关管理 API
 * @description 获取和更新注册功能开关（仅管理员可用）
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/base/auth";
import { getAppSettings, updateAppSettings } from "@/lib/services";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { verifyCsrfToken } from "@/lib/utils/csrf";

/** 获取注册状态 */
export async function GET() {
  try {
    await requireAdminSession();
    const settings = await getAppSettings();
    return jsonOk({ registrationEnabled: settings.registrationEnabled });
  } catch {
    return jsonError("未授权", 401);
  }
}

/** 更新注册开关 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    if (!verifyCsrfToken(request)) {
      return jsonError("安全验证失败，请刷新页面重试", 403);
    }
    const body = (await request.json()) as { enabled?: boolean };
    if (body.enabled === undefined) {
      return jsonError("缺少参数", 400);
    }
    await updateAppSettings({
      lightLogoAssetId: null,
      darkLogoAssetId: null,
      registrationEnabled: body.enabled,
    });
    return jsonOk({ ok: true, registrationEnabled: body.enabled });
  } catch {
    return jsonError("未授权", 401);
  }
}
