/**
 * 通知配置预览测试 API
 * @description 使用表单数据（未保存）直接发送测试通知，用于创建弹窗中的测试按钮
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getAppSettings } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { notificationChannelSchema } from "@/lib/config/schemas";

const logger = createLogger("API:Notifications:TestPreview");

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();

    const body = await request.json();
    const parsed = notificationChannelSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("数据验证失败", 400);
    }
    const data = parsed.data;

    const settings = await getAppSettings();
    const siteName = settings.siteName || "SakuraNav";

    const title = `${siteName} 测试通知`;
    const content = `这是一条来自 ${siteName} 的测试通知。当你收到此消息，说明通知配置正确可用。`;

    // 构建请求体
    let reqBody: string | URLSearchParams;
    const headers: Record<string, string> = {};

    if (data.contentType === "application/json") {
      reqBody = JSON.stringify({
        [data.titleParam]: title,
        [data.contentParam]: content,
      });
      headers["Content-Type"] = "application/json";
    } else {
      reqBody = new URLSearchParams({
        [data.titleParam]: title,
        [data.contentParam]: content,
      }).toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    // 发送请求
    const fetchOptions: RequestInit = {
      method: data.method,
      headers,
      signal: AbortSignal.timeout(10000),
    };
    if (data.method !== "GET") {
      fetchOptions.body = reqBody;
    }

    const response = await fetch(data.url, fetchOptions);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.warning("预览测试通知发送失败", { status: response.status, body: text.slice(0, 200) });
      return jsonError(`请求失败 (HTTP ${response.status}): ${text.slice(0, 100) || response.statusText}`);
    }

    logger.info("预览测试通知发送成功", { userId: session.userId });
    return jsonOk({ ok: true, status: response.status });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("预览测试通知发送异常", error);
    const message = error instanceof Error ? error.message : "发送失败";
    if (error instanceof TypeError && message.includes("fetch")) {
      return jsonError("网络请求失败，请检查请求地址是否正确");
    }
    return jsonError(message, 500);
  }
}
