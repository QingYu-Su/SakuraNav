/**
 * 通知配置测试 API
 * @description 发送一条测试通知到指定配置
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getNotificationChannelById } from "@/lib/services";
import { getAppSettings } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Notifications:Test");

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUserSession();
    const { id } = await context.params;

    const channel = await getNotificationChannelById(id, session.userId);
    if (!channel) {
      return jsonError("通知配置不存在", 404);
    }

    const settings = await getAppSettings();
    const siteName = settings.siteName || "SakuraNav";

    const title = `${siteName} 测试通知`;
    const content = `这是一条来自 ${siteName} 的测试通知。当你收到此消息，说明通知配置正确可用。`;

    // 构建请求体
    let body: string | URLSearchParams;
    const headers: Record<string, string> = {};

    if (channel.contentType === "application/json") {
      body = JSON.stringify({
        [channel.titleParam]: title,
        [channel.contentParam]: content,
      });
      headers["Content-Type"] = "application/json";
    } else {
      body = new URLSearchParams({
        [channel.titleParam]: title,
        [channel.contentParam]: content,
      }).toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    // 发送请求
    const fetchOptions: RequestInit = {
      method: channel.method,
      headers,
      signal: AbortSignal.timeout(10000), // 10 秒超时
    };
    // GET 请求通常不携带 body
    if (channel.method !== "GET") {
      fetchOptions.body = body;
    }

    const response = await fetch(channel.url, fetchOptions);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.warning("测试通知发送失败", { channelId: id, status: response.status, body: text.slice(0, 200) });
      return jsonError(`请求失败 (HTTP ${response.status}): ${text.slice(0, 100) || response.statusText}`);
    }

    logger.info("测试通知发送成功", { channelId: id, userId: session.userId });
    return jsonOk({ ok: true, status: response.status });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("测试通知发送异常", error);
    const message = error instanceof Error ? error.message : "发送失败";
    if (error instanceof TypeError && message.includes("fetch")) {
      return jsonError("网络请求失败，请检查请求地址是否正确");
    }
    return jsonError(message, 500);
  }
}
