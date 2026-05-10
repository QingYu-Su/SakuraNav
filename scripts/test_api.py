#!/usr/bin/env python3
"""
SakuraNav API 自动化测试脚本

测试所有支持 Token 认证的 REST API 端点。
仅使用 Python 标准库，无需额外依赖。

用法:
  python scripts/test_api.py --url https://your-site.com --token sak_xxx
  python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --api "GET /api/health"
  python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --api "POST /api/tags"
  python scripts/test_api.py --url http://localhost:3000 --token sak_xxx --group tags
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import urllib.parse

# 仅对 localhost / 127.0.0.1 / [::1] 绕过系统代理，远程请求保留正常代理行为
def _is_local_url(url):
    from urllib.parse import urlparse
    host = urlparse(url).hostname or ""
    return host in ("localhost", "127.0.0.1", "::1")

_no_proxy_handler = urllib.request.ProxyHandler({})
_local_opener = urllib.request.build_opener(_no_proxy_handler)

# ============================================================
# 全局配置
# ============================================================

BASE_URL = ""
TOKEN = ""
TIMEOUT = 30
DELAY = 0.1  # 请求间延迟（秒），避免触发速率限制
TEST_PREFIX = "[API-Test]"

# ANSI 颜色码
COLOR_GREEN = "\033[92m"
COLOR_RED = "\033[91m"
COLOR_YELLOW = "\033[93m"
COLOR_CYAN = "\033[96m"
COLOR_BOLD = "\033[1m"
COLOR_RESET = "\033[0m"
USE_COLOR = True

# ============================================================
# 工具函数
# ============================================================


def enable_color():
    """检测是否支持 ANSI 颜色"""
    global USE_COLOR
    if hasattr(sys.stdout, "isatty") and sys.stdout.isatty():
        USE_COLOR = True
    else:
        USE_COLOR = False


def c(text, color):
    """为文本添加颜色"""
    if USE_COLOR:
        return color + text + COLOR_RESET
    return text


def request(method, path, body=None, expect_status=200, headers_extra=None, binary=False):
    """
    发送 HTTP 请求并返回 (status, response_json, elapsed_ms)
    binary=True 时，response_json 为 bytes 类型（用于 ZIP 等二进制响应）
    """
    url = BASE_URL.rstrip("/") + path
    headers = {
        "Authorization": "Bearer " + TOKEN,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if headers_extra:
        headers.update(headers_extra)

    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    start = time.time()
    try:
        if _is_local_url(url):
            resp = _local_opener.open(req, timeout=TIMEOUT)
        else:
            resp = urllib.request.urlopen(req, timeout=TIMEOUT)
        status = resp.getcode()
        raw_bytes = resp.read()
        elapsed = int((time.time() - start) * 1000)
        if binary:
            return status, raw_bytes, elapsed
        raw = raw_bytes.decode("utf-8")
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = raw
        return status, result, elapsed
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8") if e.fp else ""
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = raw
        elapsed = int((time.time() - start) * 1000)
        return e.code, result, elapsed
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        return 0, str(e), elapsed


def delay():
    """请求间短暂延迟"""
    if DELAY > 0:
        time.sleep(DELAY)


# ============================================================
# 测试结果记录
# ============================================================

results = []


def record(name, method, path, passed, status, detail, elapsed_ms=0):
    """记录并打印单条测试结果"""
    if passed:
        tag = c("PASS", COLOR_GREEN)
        detail_str = c(detail, COLOR_CYAN) if detail else ""
    else:
        tag = c("FAIL", COLOR_RED)
        detail_str = c("  → " + detail, COLOR_RED) if detail else ""

    status_str = str(status) if status else "ERR"
    time_str = "({}ms)".format(elapsed_ms) if elapsed_ms else ""
    line = "[{}] {:6} {:42} {:>4}  {} {}".format(
        tag, method, path, status_str, detail_str, time_str
    )
    print(line)
    results.append({
        "name": name,
        "method": method,
        "path": path,
        "passed": passed,
        "status": status,
        "detail": detail,
        "elapsed_ms": elapsed_ms,
    })


def print_summary():
    """打印汇总报告"""
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    print()
    print("=" * 60)
    print(c("  汇总", COLOR_BOLD))
    print("=" * 60)
    print("  总计: {}  通过: {}  失败: {}".format(
        total, c(str(passed), COLOR_GREEN), c(str(failed), COLOR_RED)
    ))
    if failed > 0:
        print()
        print(c("  失败列表:", COLOR_RED))
        for r in results:
            if not r["passed"]:
                print("    - {} {}: {}".format(r["method"], r["path"], r["detail"]))
    print("=" * 60)
    return failed


# ============================================================
# 测试用例定义
# ============================================================


def test_health():
    """健康检查"""
    status, body, ms = request("GET", "/api/health", expect_status=200)
    ok = status == 200 and isinstance(body, dict) and body.get("status") == "ok"
    record("健康检查", "GET", "/api/health", ok, status,
           "OK" if ok else "预期 {status:'ok'}, 实际: {}".format(
               json.dumps(body, ensure_ascii=False)[:200]), ms)


def test_navigation():
    """导航数据（只读）"""
    group = "navigation"

    # GET /api/navigation/tags
    status, body, ms = request("GET", "/api/navigation/tags")
    ok = status == 200 and isinstance(body, dict)
    record("获取导航标签", "GET", "/api/navigation/tags", ok, status,
           "返回 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)
    delay()

    # GET /api/navigation/cards — 返回全部类型卡片（网站 + 社交 + 笔记）
    status, body, ms = request("GET", "/api/navigation/cards")
    ok = status == 200 and isinstance(body, dict)
    record("获取导航全部卡片", "GET", "/api/navigation/cards", ok, status,
           "返回 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)
    delay()

    # GET /api/navigation/site-cards — 仅返回网站卡片（card_type 为空）
    status, body, ms = request("GET", "/api/navigation/site-cards")
    ok = status == 200 and isinstance(body, dict)
    record("获取导航网站", "GET", "/api/navigation/site-cards", ok, status,
           "返回 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)
    delay()

    # GET /api/navigation/social-cards
    status, body, ms = request("GET", "/api/navigation/social-cards")
    ok = status == 200 and isinstance(body, dict)
    record("获取导航社交卡片", "GET", "/api/navigation/social-cards", ok, status,
           "返回 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)
    delay()

    # GET /api/navigation/note-cards
    status, body, ms = request("GET", "/api/navigation/note-cards")
    ok = status == 200 and isinstance(body, dict)
    record("获取导航笔记卡片", "GET", "/api/navigation/note-cards", ok, status,
           "返回 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)


def test_search():
    """搜索"""
    status, body, ms = request("GET", "/api/search/suggest?q=test")
    ok = status == 200 and isinstance(body, (dict, list))
    record("搜索建议", "GET", "/api/search/suggest?q=test", ok, status,
           "OK" if ok else str(body)[:200], ms)


def test_tags_crud():
    """标签完整 CRUD 测试"""
    tag_name = "{} 标签 {}".format(TEST_PREFIX, int(time.time()))
    tag_id = None

    try:
        # 1. 创建标签
        status, body, ms = request("POST", "/api/tags", {
            "name": tag_name,
            "description": "API 测试自动创建",
        })
        ok = status == 200 and isinstance(body, dict) and body.get("item", {}).get("id")
        if ok:
            tag_id = body["item"]["id"]
        record("创建标签", "POST", "/api/tags", ok, status,
               "ID: {}".format(tag_id) if ok else str(body)[:200], ms)
        if not ok:
            return
        delay()

        # 2. 获取标签列表（验证新标签存在）
        status, body, ms = request("GET", "/api/tags")
        ok = status == 200 and isinstance(body, dict) and any(
            t.get("id") == tag_id for t in body.get("items", [])
        )
        record("获取标签列表(验证创建)", "GET", "/api/tags", ok, status,
               "共 {} 项".format(len(body.get("items", []))) if ok else "未找到新创建的标签", ms)
        delay()

        # 3. 更新标签
        new_name = tag_name + " (已更新)"
        status, body, ms = request("PUT", "/api/tags", {
            "id": tag_id,
            "name": new_name,
            "description": "API 测试更新",
        })
        ok = status == 200 and isinstance(body, dict) and body.get("item", {}).get("name") == new_name
        record("更新标签", "PUT", "/api/tags", ok, status,
               "OK" if ok else str(body)[:200], ms)
        delay()

        # 4. 标签排序
        status_all, body_all, _ = request("GET", "/api/tags")
        if status_all == 200 and body_all.get("items"):
            ids = [t["id"] for t in body_all["items"]]
            # 反转排序
            ids_reversed = list(reversed(ids))
            status, body, ms = request("PUT", "/api/tags/reorder", {"ids": ids_reversed})
            ok = status == 200 and isinstance(body, dict) and body.get("ok") is True
            record("标签排序", "PUT", "/api/tags/reorder", ok, status,
                   "OK" if ok else str(body)[:200], ms)
            # 恢复原排序
            request("PUT", "/api/tags/reorder", {"ids": ids})
            delay()
        else:
            record("标签排序", "PUT", "/api/tags/reorder", False, 0, "无法获取标签列表", 0)

    finally:
        # 5. 清理：删除标签
        if tag_id:
            delay()
            status, body, ms = request("DELETE", "/api/tags?id=" + tag_id)
            ok = status == 200
            record("删除标签(清理)", "DELETE", "/api/tags?id=...", ok, status,
                   "OK" if ok else str(body)[:200], ms)


def test_site_cards_crud():
    """网站卡片完整 CRUD 测试 — 覆盖 siteInputSchema 全部可测字段"""
    card_name = "{} 网站 {}".format(TEST_PREFIX, int(time.time()))
    card_id = None
    test_url = "https://example.com/test-api"

    try:
        # 1. 创建网站卡片（包含所有可设置字段）
        create_payload = {
            "name": card_name,
            "siteUrl": test_url,
            "siteDescription": "API 测试自动创建",
            "iconUrl": None,
            "iconBgColor": "#ff6600",
            "siteIsPinned": False,
            "siteSkipOnlineCheck": True,
            "siteOnlineCheckFrequency": "1d",
            "siteOnlineCheckTimeout": 5,
            "siteOnlineCheckMatchMode": "status",
            "siteOnlineCheckKeyword": "",
            "siteOnlineCheckFailThreshold": 3,
            "siteOfflineNotify": True,
            "siteAccessRules": None,
            "siteRecommendContext": "测试推荐上下文",
            "siteRecommendContextEnabled": True,
            "siteRecommendContextAutoGen": False,
            "siteAiRelationEnabled": False,
            "siteRelatedSites": [],
            "siteRelatedSitesEnabled": True,
            "siteNotes": "测试备注内容",
            "siteTodos": [],
            "tagIds": [],
        }
        status, body, ms = request("POST", "/api/site-cards", create_payload)
        ok = status == 200 and isinstance(body, dict) and body.get("item", {}).get("id")
        if ok:
            card_id = body["item"]["id"]
        record("创建网站卡片", "POST", "/api/site-cards", ok, status,
               "ID: {}".format(card_id) if ok else str(body)[:200], ms)
        if not ok:
            return
        delay()

        # 1b. 验证创建返回的字段完整性
        item = body.get("item", {})
        field_checks = {
            "name": item.get("name") == card_name,
            "siteUrl": item.get("siteUrl") == test_url,
            "siteDescription": item.get("siteDescription") == "API 测试自动创建",
            "iconBgColor": item.get("iconBgColor") == "#ff6600",
            "siteSkipOnlineCheck": item.get("siteSkipOnlineCheck") is True,
            "siteRecommendContext": item.get("siteRecommendContext") == "测试推荐上下文",
            "siteNotes": item.get("siteNotes") == "测试备注内容",
        }
        all_ok = all(field_checks.values())
        failed_fields = [k for k, v in field_checks.items() if not v]
        record("验证创建字段", "(check)", card_id, all_ok, 0,
               "全部匹配" if all_ok else "不匹配: {}".format(", ".join(failed_fields)), 0)
        delay()

        # 2. 获取网站卡片列表
        status, body, ms = request("GET", "/api/site-cards")
        ok = status == 200 and isinstance(body, dict)
        record("获取网站卡片列表", "GET", "/api/site-cards", ok, status,
               "共 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)
        delay()

        # 3. 更新网站卡片（修改多个字段）
        update_payload = {
            "id": card_id,
            "name": card_name + " (已更新)",
            "siteUrl": test_url,
            "siteDescription": "API 测试更新",
            "iconBgColor": "#0066ff",
            "siteIsPinned": True,
            "siteSkipOnlineCheck": True,
            "siteOnlineCheckFrequency": "1h",
            "siteOnlineCheckTimeout": 10,
            "siteOnlineCheckMatchMode": "keyword",
            "siteOnlineCheckKeyword": "ok",
            "siteOnlineCheckFailThreshold": 5,
            "siteOfflineNotify": False,
            "siteAccessRules": {"urls": [{"id": "rule-1", "url": "https://alt.example.com", "label": "备选"}]},
            "siteRecommendContext": "更新后上下文",
            "siteRecommendContextEnabled": False,
            "siteRecommendContextAutoGen": False,
            "siteAiRelationEnabled": True,
            "siteRelatedSites": [],
            "siteRelatedSitesEnabled": False,
            "siteNotes": "更新后备注",
            "siteTodos": [{"id": "todo-1", "text": "待办事项", "completed": False}],
            "tagIds": [],
        }
        status, body, ms = request("PUT", "/api/site-cards", update_payload)
        ok = status == 200 and isinstance(body, dict)
        record("更新网站卡片", "PUT", "/api/site-cards", ok, status,
               "OK" if ok else str(body)[:200], ms)
        delay()

        # 3b. 验证更新后的字段
        updated = body.get("item", {})
        update_checks = {
            "name": updated.get("name") == card_name + " (已更新)",
            "iconBgColor": updated.get("iconBgColor") == "#0066ff",
            "siteIsPinned": updated.get("siteIsPinned") is True,
            "siteOnlineCheckFrequency": updated.get("siteOnlineCheckFrequency") == "1h",
            "siteOnlineCheckMatchMode": updated.get("siteOnlineCheckMatchMode") == "keyword",
            "siteOnlineCheckKeyword": updated.get("siteOnlineCheckKeyword") == "ok",
            "siteOnlineCheckFailThreshold": updated.get("siteOnlineCheckFailThreshold") == 5,
            "siteOfflineNotify": updated.get("siteOfflineNotify") is False,
            "siteRecommendContext": updated.get("siteRecommendContext") == "更新后上下文",
            "siteNotes": updated.get("siteNotes") == "更新后备注",
            "siteTodos": len(updated.get("siteTodos", [])) == 1,
        }
        all_ok = all(update_checks.values())
        failed_fields = [k for k, v in update_checks.items() if not v]
        record("验证更新字段", "(check)", card_id, all_ok, 0,
               "全部匹配" if all_ok else "不匹配: {}".format(", ".join(failed_fields)), 0)
        delay()

        # 4. 更新备忘（单独的 memo 接口）
        status, body, ms = request("PATCH", "/api/site-cards/memo", {
            "id": card_id,
            "siteNotes": "单独更新备忘",
            "siteTodos": [{"id": "todo-1", "text": "待办事项", "completed": True}],
        })
        ok = status == 200
        record("更新网站备忘", "PATCH", "/api/site-cards/memo", ok, status,
               "OK" if ok else str(body)[:200], ms)
        delay()

        # 5. 单站在线检测
        status, body, ms = request("POST", "/api/site-cards/check-online-single", {
            "cardId": card_id,
        })
        ok = status == 200 and isinstance(body, dict) and "online" in body
        record("单站在线检测", "POST", "/api/site-cards/check-online-single", ok, status,
               "online={}".format(body.get("online")) if ok else str(body)[:200], ms)
        delay()

        # 6. 全局排序
        status_all, body_all, _ = request("GET", "/api/site-cards")
        if status_all == 200 and body_all.get("items"):
            ids = [c["id"] for c in body_all["items"]]
            status, body, ms = request("PUT", "/api/site-cards/reorder-global", {"ids": ids})
            ok = status == 200 and body.get("ok") is True
            record("全局网站排序", "PUT", "/api/site-cards/reorder-global", ok, status,
                   "OK" if ok else str(body)[:200], ms)
            delay()
        else:
            record("全局网站排序", "PUT", "/api/site-cards/reorder-global", False, 0,
                   "无法获取网站列表", 0)

    finally:
        if card_id:
            delay()
            status, body, ms = request("DELETE", "/api/site-cards?id=" + card_id)
            ok = status == 200
            record("删除网站卡片(清理)", "DELETE", "/api/site-cards?id=...", ok, status,
                   "OK" if ok else str(body)[:200], ms)


def test_social_cards_crud():
    """社交卡片完整 CRUD 测试"""
    card_label = "{} 社交 {}".format(TEST_PREFIX, int(time.time()))
    card_id = None

    try:
        # 1. 创建社交卡片
        status, body, ms = request("POST", "/api/social-cards", {
            "cardType": "email",
            "label": card_label,
            "payload": {"email": "test@example.com"},
        })
        ok = status == 200 and isinstance(body, dict) and body.get("item", {}).get("id")
        if ok:
            card_id = body["item"]["id"]
        record("创建社交卡片", "POST", "/api/social-cards", ok, status,
               "ID: {}".format(card_id) if ok else str(body)[:200], ms)
        if not ok:
            return
        delay()

        # 2. 获取社交卡片列表
        status, body, ms = request("GET", "/api/social-cards")
        ok = status == 200 and isinstance(body, dict)
        record("获取社交卡片列表", "GET", "/api/social-cards", ok, status,
               "共 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)
        delay()

        # 3. 更新社交卡片
        new_label = card_label + " (已更新)"
        status, body, ms = request("PUT", "/api/social-cards", {
            "id": card_id,
            "cardType": "email",
            "label": new_label,
            "payload": {"email": "updated@example.com"},
        })
        ok = status == 200 and isinstance(body, dict)
        record("更新社交卡片", "PUT", "/api/social-cards", ok, status,
               "OK" if ok else str(body)[:200], ms)
        delay()

        # 4. 社交卡片排序
        status_all, body_all, _ = request("GET", "/api/social-cards")
        if status_all == 200 and body_all.get("items"):
            ids = [c["id"] for c in body_all["items"]]
            status, body, ms = request("PUT", "/api/social-cards/reorder", {"ids": ids})
            ok = status == 200 and body.get("ok") is True
            record("社交卡片排序", "PUT", "/api/social-cards/reorder", ok, status,
                   "OK" if ok else str(body)[:200], ms)
            delay()
        else:
            record("社交卡片排序", "PUT", "/api/social-cards/reorder", False, 0,
                   "无法获取社交卡片列表", 0)

    finally:
        if card_id:
            delay()
            status, body, ms = request("DELETE", "/api/social-cards?id=" + card_id)
            ok = status == 200
            record("删除社交卡片(清理)", "DELETE", "/api/social-cards?id=...", ok, status,
                   "OK" if ok else str(body)[:200], ms)


def test_note_cards_crud():
    """笔记卡片完整 CRUD 测试"""
    note_title = "{} 笔记 {}".format(TEST_PREFIX, int(time.time()))
    note_id = None

    try:
        # 1. 创建笔记卡片
        status, body, ms = request("POST", "/api/note-cards", {
            "title": note_title,
            "content": "测试笔记内容",
        })
        ok = status == 200 and isinstance(body, dict) and body.get("item", {}).get("id")
        if ok:
            note_id = body["item"]["id"]
        record("创建笔记卡片", "POST", "/api/note-cards", ok, status,
               "ID: {}".format(note_id) if ok else str(body)[:200], ms)
        if not ok:
            return
        delay()

        # 2. 获取笔记卡片列表
        status, body, ms = request("GET", "/api/note-cards")
        ok = status == 200 and isinstance(body, dict)
        record("获取笔记卡片列表", "GET", "/api/note-cards", ok, status,
               "共 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)
        delay()

        # 3. 更新笔记卡片
        new_title = note_title + " (已更新)"
        status, body, ms = request("PUT", "/api/note-cards", {
            "id": note_id,
            "title": new_title,
            "content": "更新后的笔记内容",
        })
        ok = status == 200 and isinstance(body, dict)
        record("更新笔记卡片", "PUT", "/api/note-cards", ok, status,
               "OK" if ok else str(body)[:200], ms)
        delay()

        # 4. 附件管理（仅测试列表接口）
        status, body, ms = request("GET", "/api/note-cards/attachment?noteId=" + note_id)
        ok = status == 200
        record("获取笔记附件列表", "GET", "/api/note-cards/attachment", ok, status,
               "OK" if ok else str(body)[:200], ms)

    finally:
        if note_id:
            delay()
            status, body, ms = request("DELETE", "/api/note-cards?id=" + note_id)
            ok = status == 200
            record("删除笔记卡片(清理)", "DELETE", "/api/note-cards?id=...", ok, status,
                   "OK" if ok else str(body)[:200], ms)


def test_snapshots_crud():
    """快照完整 CRUD 测试"""
    snapshot_id = None

    try:
        # 1. 创建快照
        status, body, ms = request("POST", "/api/snapshots", {
            "label": "{} 快照测试".format(TEST_PREFIX),
        })
        ok = status == 200 and isinstance(body, dict)
        if ok:
            # 快照可能因为数据无变化而跳过
            if body.get("item") and body["item"].get("id"):
                snapshot_id = body["item"]["id"]
            elif body.get("id"):
                snapshot_id = body["id"]
            elif body.get("message") and "跳过" in str(body.get("message", "")):
                # 数据无变化快照跳过，仍算通过
                record("创建快照", "POST", "/api/snapshots", True, status,
                       "数据无变化，快照已跳过", ms)
                # 获取已有快照列表用于后续测试
                status2, body2, _ = request("GET", "/api/snapshots")
                if status2 == 200 and body2.get("items"):
                    snapshot_id = body2["items"][0].get("id")
                return
        if snapshot_id is None and ok:
            record("创建快照", "POST", "/api/snapshots", ok, status,
                   "ID: (无ID返回)", ms)
            return
        else:
            record("创建快照", "POST", "/api/snapshots", ok, status,
                   "ID: {}".format(snapshot_id) if ok else str(body)[:200], ms)
        if not snapshot_id:
            return
        delay()

        # 2. 获取快照列表
        status, body, ms = request("GET", "/api/snapshots")
        ok = status == 200 and isinstance(body, dict)
        record("获取快照列表", "GET", "/api/snapshots", ok, status,
               "共 {} 项".format(len(body.get("items", []))) if ok else str(body)[:200], ms)
        delay()

        # 3. 重命名快照
        status, body, ms = request("PATCH", "/api/snapshots?id=" + snapshot_id, {
            "label": "{} 快照 (已重命名)".format(TEST_PREFIX),
        })
        ok = status == 200
        record("重命名快照", "PATCH", "/api/snapshots", ok, status,
               "OK" if ok else str(body)[:200], ms)

    finally:
        # 4. 清理：删除快照
        if snapshot_id:
            delay()
            status, body, ms = request("DELETE", "/api/snapshots?id=" + snapshot_id)
            ok = status == 200
            record("删除快照(清理)", "DELETE", "/api/snapshots", ok, status,
                   "OK" if ok else str(body)[:200], ms)



# ============================================================
# 测试注册表
# ============================================================

# 每个测试组的名称、分组标识、执行函数、包含的 API 标识列表
TEST_GROUPS = [
    {
        "name": "健康检查",
        "group": "health",
        "func": test_health,
        "apis": ["GET /api/health"],
    },
    {
        "name": "导航数据",
        "group": "navigation",
        "func": test_navigation,
        "apis": [
            "GET /api/navigation/tags",
            "GET /api/navigation/cards",
            "GET /api/navigation/site-cards",
            "GET /api/navigation/social-cards",
            "GET /api/navigation/note-cards",
        ],
    },
    {
        "name": "搜索",
        "group": "search",
        "func": test_search,
        "apis": ["GET /api/search/suggest"],
    },
    {
        "name": "标签管理",
        "group": "tags",
        "func": test_tags_crud,
        "apis": [
            "GET /api/tags",
            "POST /api/tags",
            "PUT /api/tags",
            "DELETE /api/tags",
            "PUT /api/tags/reorder",
        ],
    },
    {
        "name": "网站卡片管理",
        "group": "site-cards",
        "func": test_site_cards_crud,
        "apis": [
            "GET /api/site-cards",
            "POST /api/site-cards",
            "PUT /api/site-cards",
            "DELETE /api/site-cards",
            "PATCH /api/site-cards/memo",
            "POST /api/site-cards/check-online-single",
            "PUT /api/site-cards/reorder-global",
        ],
    },
    {
        "name": "社交卡片管理",
        "group": "social-cards",
        "func": test_social_cards_crud,
        "apis": [
            "GET /api/social-cards",
            "POST /api/social-cards",
            "PUT /api/social-cards",
            "DELETE /api/social-cards",
            "PUT /api/social-cards/reorder",
        ],
    },
    {
        "name": "笔记卡片管理",
        "group": "note-cards",
        "func": test_note_cards_crud,
        "apis": [
            "GET /api/note-cards",
            "POST /api/note-cards",
            "PUT /api/note-cards",
            "DELETE /api/note-cards",
            "GET /api/note-cards/attachment",
        ],
    },
    {
        "name": "快照管理",
        "group": "snapshots",
        "func": test_snapshots_crud,
        "apis": [
            "GET /api/snapshots",
            "POST /api/snapshots",
            "PATCH /api/snapshots",
            "DELETE /api/snapshots",
        ],
    },
]



def run_all(api_filter=None, group_filter=None):
    """运行所有测试"""
    print(c("=" * 60, COLOR_BOLD))
    print(c("  SakuraNav API 自动化测试", COLOR_BOLD))
    print(c("=" * 60, COLOR_BOLD))
    print("  目标: {}".format(BASE_URL))
    print("  时间: {}".format(time.strftime("%Y-%m-%d %H:%M:%S")))
    if api_filter:
        print("  过滤: {}".format(api_filter))
    if group_filter:
        print("  分组: {}".format(group_filter))
    print()

    for group in TEST_GROUPS:
        # 如果指定了 --api 过滤
        if api_filter:
            if api_filter not in group["apis"]:
                continue

        # 如果指定了 --group 过滤
        if group_filter and group["group"] != group_filter:
            continue

        print(c("── {} ──".format(group["name"]), COLOR_BOLD))
        try:
            group["func"]()
        except Exception as e:
            print(c("  [ERROR] 测试组异常: {}".format(str(e)), COLOR_RED))
        print()
        delay()

    return print_summary()


# ============================================================
# 入口
# ============================================================


def main():
    global BASE_URL, TOKEN

    parser = argparse.ArgumentParser(description="SakuraNav API 自动化测试脚本")
    parser.add_argument("--url", required=True, help="站点根地址（如 https://your-site.com）")
    parser.add_argument("--token", required=True, help="API Token（sak_xxx）")
    parser.add_argument("--api", help="只测试指定 API，格式: 'METHOD /path'（如 'GET /api/health'）")
    parser.add_argument("--group", help="只测试指定分组（health/tags/site-cards/social-cards/note-cards/snapshots/navigation/search）")

    args = parser.parse_args()
    BASE_URL = args.url.rstrip("/")
    TOKEN = args.token

    enable_color()

    # 验证连接
    print("正在验证连接...")
    status, body, ms = request("GET", "/api/health")
    if status != 200:
        print(c("连接失败: {} - {}".format(status, str(body)[:200]), COLOR_RED))
        sys.exit(1)
    print(c("连接成功! ({}ms)".format(ms), COLOR_GREEN))
    print()

    failed = run_all(api_filter=args.api, group_filter=args.group)
    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
