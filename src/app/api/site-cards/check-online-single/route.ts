/**
* 单卡片在线检查 API 路由
* @description 检测指定网站卡片的在线状态，先查 URL 缓存，20 小时内直接返回缓存结果
* 缓存未命中时使用 HEAD → GET 回退策略，失败后最多重试 3 次（2 秒间隔）
*/

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getCardById } from "@/lib/services/card-repository";
import { performSingleSiteCardOnlineCheck } from "@/lib/services/online-check-service";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:CheckOnlineSingle");

export async function POST(request: NextRequest) {
  try {
    await requireUserSession();

    const ip = getClientIp(request);
    if (isRateLimited(ip, "onlineCheck")) {
      return jsonError("请求过于频繁，请稍后再试", 429);
    }

    const body = (await request.json()) as { cardId?: string };
    if (!body.cardId) {
      return jsonError("缺少卡片 ID", 400);
    }

    const card = await getCardById(body.cardId);
    if (!card) {
      return jsonError("卡片不存在", 404);
    }

    const online = await performSingleSiteCardOnlineCheck(body.cardId);
    if (online === null) {
      return jsonError("卡片不存在", 404);
    }

    return jsonOk({ id: card.id, online, cached: false });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("单卡片在线检查失败", error);
    return jsonError(error instanceof Error ? error.message : "检查失败", 500);
  }
}
