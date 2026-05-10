#!/usr/bin/env python3
"""
SakuraNav MCP 自动化测试脚本

测试所有 MCP 工具（通过 SSE 协议）。
仅使用 Python 标准库，无需额外依赖。

用法:
  python scripts/test_mcp.py --url https://your-site.com --token sak_xxx
  python scripts/test_mcp.py --url http://localhost:3000 --token sak_xxx --tool list_tags
  python scripts/test_mcp.py --url http://localhost:3000 --token sak_xxx --group tags
"""

import argparse
import http.client
import json
import queue
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

# 仅对 localhost / 127.0.0.1 / [::1] 绕过系统代理，远程请求保留正常代理行为
def _is_local_url(url):
    host = urllib.parse.urlparse(url).hostname or ""
    return host in ("localhost", "127.0.0.1", "::1")

_no_proxy_handler = urllib.request.ProxyHandler({})
_local_opener = urllib.request.build_opener(_no_proxy_handler)

# ============================================================
# 全局配置
# ============================================================

BASE_URL = ""
TOKEN = ""
TIMEOUT = 30
DELAY = 0.1
TEST_PREFIX = "[MCP-Test]"
RPC_ID = 0

# ANSI 颜色码
COLOR_GREEN = "\033[92m"
COLOR_RED = "\033[91m"
COLOR_YELLOW = "\033[93m"
COLOR_CYAN = "\033[96m"
COLOR_BOLD = "\033[1m"
COLOR_RESET = "\033[0m"
USE_COLOR = True

# ============================================================
# SSE 客户端（通过旧版 SSE 协议与 MCP 服务端通信）
# ============================================================

class SseClient:
    """
    通过旧版 SSE 协议连接 MCP 服务端。
    - 后台线程维持 GET /api/mcp/sse 长连接，读取 SSE 事件
    - 主线程通过 POST /api/mcp/sse/messages?sessionId=xxx 发送请求
    - 通过 queue 将响应传回主线程
    """

    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.parsed = urllib.parse.urlparse(self.base_url)
        self.host = self.parsed.hostname
        self.port = self.parsed.port or (443 if self.parsed.scheme == "https" else 80)
        self.scheme = self.parsed.scheme

        self.session_id = None
        self._response_queue = queue.Queue()
        self._sock = None
        self._reader_thread = None
        self._stop_event = threading.Event()
        self._connected = threading.Event()

    def connect(self, timeout=15):
        """建立 SSE 连接并等待 sessionId"""
        self._reader_thread = threading.Thread(target=self._read_sse, daemon=True)
        self._reader_thread.start()
        return self._connected.wait(timeout=timeout)

    def close(self):
        """关闭 SSE 连接"""
        self._stop_event.set()
        if self._sock:
            try:
                self._sock.close()
            except Exception:
                pass

    def send_request(self, payload, timeout=30):
        """
        发送 JSON-RPC 请求并等待响应。
        返回 (success, result_or_error, elapsed_ms)
        """
        if not self.session_id:
            return False, "SSE 未连接", 0

        start = time.time()
        rpc_id = payload.get("id")

        # POST 请求到 SSE messages 端点
        path = "/api/mcp/sse/messages?sessionId=" + self.session_id
        body = json.dumps(payload).encode("utf-8")

        try:
            conn = self._make_http_connection()
            conn.request("POST", path, body=body, headers={
                "Authorization": "Bearer " + self.token,
                "Content-Type": "application/json",
            })
            resp = conn.getresponse()
            resp.read()  # 消费响应体（202 空）
            conn.close()

            if resp.status != 202:
                elapsed = int((time.time() - start) * 1000)
                return False, "POST 返回 {}".format(resp.status), elapsed
        except Exception as e:
            elapsed = int((time.time() - start) * 1000)
            return False, "POST 失败: {}".format(str(e)), elapsed

        # 等待 SSE 响应（通过 id 匹配）
        deadline = time.time() + timeout
        while time.time() < deadline:
            remaining = deadline - time.time()
            try:
                msg = self._response_queue.get(timeout=min(remaining, 1.0))
                if isinstance(msg, dict):
                    # 匹配 RPC id
                    if msg.get("id") == rpc_id:
                        elapsed = int((time.time() - start) * 1000)
                        if "error" in msg:
                            return False, msg["error"], elapsed
                        return True, msg.get("result", msg), elapsed
                    # 不匹配的响应放回队列
                    self._response_queue.put(msg)
            except queue.Empty:
                continue

        elapsed = int((time.time() - start) * 1000)
        return False, "响应超时 ({}ms)".format(elapsed), elapsed

    def _make_http_connection(self):
        """创建 HTTP 连接"""
        if self.scheme == "https":
            return http.client.HTTPSConnection(self.host, self.port, timeout=TIMEOUT)
        return http.client.HTTPConnection(self.host, self.port, timeout=TIMEOUT)

    def _read_sse(self):
        """后台线程：读取 SSE 流"""
        try:
            self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._sock.settimeout(60)
            self._sock.connect((self.host, self.port))

            req = (
                "GET /api/mcp/sse HTTP/1.1\r\n"
                "Host: {}\r\n"
                "Authorization: Bearer {}\r\n"
                "Accept: text/event-stream\r\n"
                "Connection: keep-alive\r\n"
                "\r\n"
            ).format(
                self.host + (":{}".format(self.port) if self.port not in (80, 443) else ""),
                self.token,
            )
            self._sock.sendall(req.encode("utf-8"))

            buf = b""
            headers_done = False
            sse_buf = ""

            while not self._stop_event.is_set():
                try:
                    chunk = self._sock.recv(8192)
                    if not chunk:
                        break
                    buf += chunk
                except socket.timeout:
                    continue
                except Exception:
                    break

                text = buf.decode("utf-8", "replace")
                buf = b""

                if not headers_done:
                    # 等待 HTTP 头部结束
                    if "\r\n\r\n" in text:
                        _, sse_buf = text.split("\r\n\r\n", 1)
                        headers_done = True
                    else:
                        continue
                else:
                    sse_buf += text

                # 解析 SSE 事件
                sse_buf = self._parse_sse_events(sse_buf)

        except Exception as e:
            if not self._stop_event.is_set():
                pass  # 连接断开

    def _parse_sse_events(self, buf):
        """解析 SSE 事件，返回未消费的缓冲区"""
        while "\n\n" in buf:
            event_text, buf = buf.split("\n\n", 1)
            event_type = None
            data_lines = []

            for line in event_text.split("\n"):
                line = line.rstrip("\r")
                if line.startswith("event:"):
                    event_type = line[6:].strip()
                elif line.startswith("data:"):
                    data_lines.append(line[5:].strip())

            if not data_lines:
                continue

            data_str = "\n".join(data_lines)

            if event_type == "endpoint" and "sessionId=" in data_str:
                # 提取 sessionId
                for part in data_str.split("?"):
                    if "sessionId=" in part:
                        for kv in part.split("&"):
                            if kv.startswith("sessionId="):
                                self.session_id = kv.split("=", 1)[1]
                                self._connected.set()
                                break

            elif event_type == "message":
                try:
                    msg = json.loads(data_str)
                    self._response_queue.put(msg)
                except json.JSONDecodeError:
                    pass

        return buf


# 全局 SSE 客户端
_sse_client = None

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


def next_id():
    """生成下一个 RPC ID"""
    global RPC_ID
    RPC_ID += 1
    return RPC_ID


def mcp_request(method, params=None):
    """
    发送 MCP JSON-RPC 请求，返回 (success, result_or_error, elapsed_ms)
    """
    payload = {
        "jsonrpc": "2.0",
        "id": next_id(),
        "method": method,
    }
    if params is not None:
        payload["params"] = params

    return _sse_client.send_request(payload)


def call_tool(name, arguments=None):
    """调用 MCP 工具，返回 (success, content_text, elapsed_ms)"""
    params = {"name": name, "arguments": arguments if arguments is not None else {}}
    success, result, ms = mcp_request("tools/call", params)

    if not success:
        return False, str(result), ms

    # 解析工具调用结果
    if isinstance(result, dict):
        content = result.get("content", [])
        if content and isinstance(content, list):
            texts = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    texts.append(item.get("text", ""))
            return True, "\n".join(texts), ms
        is_error = result.get("isError", False)
        if is_error:
            return False, str(result), ms
        return True, json.dumps(result, ensure_ascii=False), ms

    return True, str(result), ms


def delay():
    """请求间短暂延迟"""
    if DELAY > 0:
        time.sleep(DELAY)


def parse_json(text):
    """安全解析 JSON"""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None


# ============================================================
# 测试结果记录
# ============================================================

results = []


def record(name, passed, detail, elapsed_ms=0):
    """记录并打印单条测试结果"""
    if passed:
        tag = c("PASS", COLOR_GREEN)
        detail_str = c(detail, COLOR_CYAN) if detail else ""
    else:
        tag = c("FAIL", COLOR_RED)
        detail_str = c("  → " + str(detail)[:200], COLOR_RED) if detail else ""

    time_str = "({}ms)".format(elapsed_ms) if elapsed_ms else ""
    line = "[{}] {:42} {}".format(tag, name, detail_str)
    if time_str:
        line += " " + time_str
    print(line)
    results.append({
        "name": name,
        "passed": passed,
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
                print("    - {}: {}".format(r["name"], str(r["detail"])[:200]))
    print("=" * 60)
    return failed


# ============================================================
# 测试函数 - 按模块分组
# ============================================================


def test_tags():
    """标签管理 MCP 工具测试"""
    tag_name = "{} 标签 {}".format(TEST_PREFIX, int(time.time()))
    tag_id = None

    try:
        # list_tags
        success, text, ms = call_tool("list_tags")
        ok = success and parse_json(text) is not None
        data = parse_json(text) if text else []
        record("list_tags", ok, "返回 {} 项".format(len(data) if isinstance(data, list) else "?") if ok else str(text)[:200], ms)
        delay()

        # create_tag
        success, text, ms = call_tool("create_tag", {
            "name": tag_name,
            "description": "MCP 测试自动创建",
        })
        tag_data = parse_json(text) if success else None
        ok = success and tag_data and tag_data.get("id")
        if ok:
            tag_id = tag_data["id"]
        record("create_tag", ok, "ID: {}".format(tag_id) if ok else str(text)[:200], ms)
        if not ok:
            return
        delay()

        # update_tag
        new_name = tag_name + " (已更新)"
        success, text, ms = call_tool("update_tag", {
            "id": tag_id,
            "name": new_name,
        })
        ok = success and parse_json(text) is not None
        record("update_tag", ok, "OK" if ok else str(text)[:200], ms)
        delay()

        # reorder_tags
        success_list, text_list, _ = call_tool("list_tags")
        if success_list:
            tags = parse_json(text_list) or []
            if isinstance(tags, list):
                ids = [t["id"] for t in tags if isinstance(t, dict) and "id" in t]
                if ids:
                    success, text, ms = call_tool("reorder_tags", {"ids": list(reversed(ids))})
                    ok = success
                    record("reorder_tags", ok, "OK" if ok else str(text)[:200], ms)
                    # 恢复
                    call_tool("reorder_tags", {"ids": ids})
                    delay()
                    return

        record("reorder_tags", False, "无法获取标签列表进行排序测试", 0)

    finally:
        if tag_id:
            delay()
            success, text, ms = call_tool("delete_tag", {"id": tag_id})
            ok = success
            record("delete_tag (清理)", ok, "OK" if ok else str(text)[:200], ms)


def test_site_cards():
    """网站卡片 MCP 工具测试"""
    card_name = "{} 网站 {}".format(TEST_PREFIX, int(time.time()))
    card_id = None

    try:
        # list_site_cards
        success, text, ms = call_tool("list_site_cards")
        ok = success and parse_json(text) is not None
        record("list_site_cards", ok, "OK" if ok else str(text)[:200], ms)
        delay()

        # list_all_site_cards
        success, text, ms = call_tool("list_all_site_cards")
        ok = success and parse_json(text) is not None
        data = parse_json(text) if text else []
        record("list_all_site_cards", ok,
               "返回 {} 项".format(len(data) if isinstance(data, list) else "?") if ok else str(text)[:200], ms)
        delay()

        # create_site_card
        success, text, ms = call_tool("create_site_card", {
            "name": card_name,
            "url": "https://example.com/mcp-test",
            "description": "MCP 测试自动创建",
            "skipOnlineCheck": True,
            "tagIds": [],
        })
        card_data = parse_json(text) if success else None
        ok = success and card_data and card_data.get("id")
        if ok:
            card_id = card_data["id"]
        record("create_site_card", ok, "ID: {}".format(card_id) if ok else str(text)[:200], ms)
        if not ok:
            return
        delay()

        # get_site_card
        success, text, ms = call_tool("get_site_card", {"id": card_id})
        ok = success and parse_json(text) is not None
        record("get_site_card", ok, "OK" if ok else str(text)[:200], ms)
        delay()

        # update_site_card
        success, text, ms = call_tool("update_site_card", {
            "id": card_id,
            "name": card_name + " (已更新)",
            "description": "MCP 测试更新",
        })
        ok = success and parse_json(text) is not None
        record("update_site_card", ok, "OK" if ok else str(text)[:200], ms)
        delay()

        # batch_create_site_cards
        batch_name = "{} 批量 {}".format(TEST_PREFIX, int(time.time()))
        success, text, ms = call_tool("batch_create_site_cards", {
            "sites": [
                {"name": batch_name + " - 1", "url": "https://example.com/batch1", "tagIds": []},
                {"name": batch_name + " - 2", "url": "https://example.com/batch2", "tagIds": []},
            ],
        })
        ok = success and parse_json(text) is not None
        batch_data = parse_json(text) if text else {}
        batch_ids = []
        if ok and isinstance(batch_data, dict):
            batch_ids = [s.get("id") for s in batch_data.get("sites", []) if s.get("id")]
        record("batch_create_site_cards", ok,
               "创建 {} 个".format(len(batch_ids)) if ok else str(text)[:200], ms)
        # 清理批量创建的卡片
        for bid in batch_ids:
            call_tool("delete_site_card", {"id": bid})
        delay()

    finally:
        if card_id:
            delay()
            success, text, ms = call_tool("delete_site_card", {"id": card_id})
            ok = success
            record("delete_site_card (清理)", ok, "OK" if ok else str(text)[:200], ms)


def test_social_cards():
    """社交卡片 MCP 工具测试"""
    card_label = "{} 社交 {}".format(TEST_PREFIX, int(time.time()))
    card_id = None

    try:
        # list_social_cards
        success, text, ms = call_tool("list_social_cards")
        ok = success and parse_json(text) is not None
        record("list_social_cards", ok, "OK" if ok else str(text)[:200], ms)
        delay()

        # create_social_card
        success, text, ms = call_tool("create_social_card", {
            "cardType": "email",
            "label": card_label,
            "payload": {
                "type": "email",
                "email": "mcp-test@example.com",
            },
        })
        card_data = parse_json(text) if success else None
        ok = success and card_data and card_data.get("id")
        if ok:
            card_id = card_data["id"]
        record("create_social_card", ok, "ID: {}".format(card_id) if ok else str(text)[:200], ms)
        if not ok:
            return
        delay()

        # update_social_card
        success, text, ms = call_tool("update_social_card", {
            "id": card_id,
            "label": card_label + " (已更新)",
            "payload": {
                "type": "email",
                "email": "mcp-updated@example.com",
            },
        })
        ok = success and parse_json(text) is not None
        record("update_social_card", ok, "OK" if ok else str(text)[:200], ms)

    finally:
        if card_id:
            delay()
            success, text, ms = call_tool("delete_social_card", {"id": card_id})
            ok = success
            record("delete_social_card (清理)", ok, "OK" if ok else str(text)[:200], ms)


def test_note_cards():
    """笔记卡片 MCP 工具测试"""
    note_title = "{} 笔记 {}".format(TEST_PREFIX, int(time.time()))
    note_id = None

    try:
        # list_note_cards
        success, text, ms = call_tool("list_note_cards")
        ok = success and parse_json(text) is not None
        record("list_note_cards", ok, "OK" if ok else str(text)[:200], ms)
        delay()

        # create_note_card
        success, text, ms = call_tool("create_note_card", {
            "title": note_title,
            "content": "MCP 测试自动创建的笔记内容",
        })
        card_data = parse_json(text) if success else None
        ok = success and card_data and card_data.get("id")
        if ok:
            note_id = card_data["id"]
        record("create_note_card", ok, "ID: {}".format(note_id) if ok else str(text)[:200], ms)
        if not ok:
            return
        delay()

        # update_note_card
        success, text, ms = call_tool("update_note_card", {
            "id": note_id,
            "title": note_title + " (已更新)",
            "content": "MCP 测试更新后的内容",
        })
        ok = success and parse_json(text) is not None
        record("update_note_card", ok, "OK" if ok else str(text)[:200], ms)

    finally:
        if note_id:
            delay()
            success, text, ms = call_tool("delete_note_card", {"id": note_id})
            ok = success
            record("delete_note_card (清理)", ok, "OK" if ok else str(text)[:200], ms)


def test_snapshots():
    """快照 MCP 工具测试"""
    snapshot_id = None

    try:
        # list_snapshots
        success, text, ms = call_tool("list_snapshots")
        ok = success and parse_json(text) is not None
        data = parse_json(text) if text else []
        record("list_snapshots", ok,
               "返回 {} 项".format(len(data) if isinstance(data, list) else "?") if ok else str(text)[:200], ms)
        delay()

        # create_snapshot
        success, text, ms = call_tool("create_snapshot", {
            "label": "{} 快照测试".format(TEST_PREFIX),
        })
        snap_data = parse_json(text) if success else None
        ok = success
        if ok and isinstance(snap_data, dict):
            snapshot_id = snap_data.get("id")
            if not snapshot_id and snap_data.get("message") and "跳过" in str(snap_data.get("message", "")):
                record("create_snapshot", True, "数据无变化，快照已跳过", ms)
                # 使用已有快照测试后续操作
                if isinstance(data, list) and data:
                    snapshot_id = data[0].get("id")
                return
        record("create_snapshot", ok, "ID: {}".format(snapshot_id) if snapshot_id else str(text)[:200], ms)
        if not snapshot_id:
            return
        delay()

        # get_snapshot
        success, text, ms = call_tool("get_snapshot", {"id": snapshot_id})
        ok = success and parse_json(text) is not None
        record("get_snapshot", ok, "OK" if ok else str(text)[:200], ms)

        # 注意：不测试 restore_snapshot（破坏性操作）

    finally:
        if snapshot_id:
            delay()
            success, text, ms = call_tool("delete_snapshot", {"id": snapshot_id})
            ok = success
            record("delete_snapshot (清理)", ok, "OK" if ok else str(text)[:200], ms)


def test_data_tools():
    """数据与搜索 MCP 工具测试"""
    # search_site_cards
    success, text, ms = call_tool("search_site_cards", {
        "query": "test",
        "limit": 5,
    })
    ok = success and parse_json(text) is not None
    record("search_site_cards", ok, "OK" if ok else str(text)[:200], ms)
    delay()

    # get_settings
    success, text, ms = call_tool("get_settings")
    ok = success and parse_json(text) is not None
    record("get_settings", ok, "OK" if ok else str(text)[:200], ms)
    delay()

    # get_profile
    success, text, ms = call_tool("get_profile")
    ok = success and parse_json(text) is not None
    profile = parse_json(text) if text else {}
    record("get_profile", ok,
           "用户: {}".format(profile.get("username")) if ok else str(text)[:200], ms)


def test_cards():
    """统一卡片 MCP 工具测试"""
    # list_all_cards
    success, text, ms = call_tool("list_all_cards")
    ok = success and parse_json(text) is not None
    data = parse_json(text) if text else []
    record("list_all_cards", ok,
           "返回 {} 项".format(len(data) if isinstance(data, list) else "?") if ok else str(text)[:200], ms)
    delay()

    # get_card - 如果有卡片，测试获取单个
    if isinstance(data, list) and data:
        first_id = data[0].get("id") if isinstance(data[0], dict) else None
        if first_id:
            success, text, ms = call_tool("get_card", {"id": first_id})
            ok = success and parse_json(text) is not None
            record("get_card", ok, "OK" if ok else str(text)[:200], ms)
        else:
            record("get_card", False, "无法从列表获取卡片 ID", 0)
    else:
        record("get_card", False, "无卡片数据可供测试", 0)


# ============================================================
# 测试注册表
# ============================================================

TEST_GROUPS = [
    {
        "name": "标签管理",
        "group": "tags",
        "func": test_tags,
        "tools": ["list_tags", "create_tag", "update_tag", "delete_tag", "reorder_tags"],
    },
    {
        "name": "网站卡片管理",
        "group": "site-cards",
        "func": test_site_cards,
        "tools": [
            "list_site_cards", "list_all_site_cards", "get_site_card",
            "create_site_card", "update_site_card", "delete_site_card",
            "batch_create_site_cards",
        ],
    },
    {
        "name": "社交卡片管理",
        "group": "social-cards",
        "func": test_social_cards,
        "tools": ["list_social_cards", "create_social_card", "update_social_card", "delete_social_card"],
    },
    {
        "name": "笔记卡片管理",
        "group": "note-cards",
        "func": test_note_cards,
        "tools": ["list_note_cards", "create_note_card", "update_note_card", "delete_note_card"],
    },
    {
        "name": "快照管理",
        "group": "snapshots",
        "func": test_snapshots,
        "tools": ["list_snapshots", "create_snapshot", "get_snapshot", "delete_snapshot"],
    },
    {
        "name": "数据与搜索",
        "group": "data",
        "func": test_data_tools,
        "tools": ["search_site_cards", "get_settings", "get_profile"],
    },
    {
        "name": "统一卡片",
        "group": "cards",
        "func": test_cards,
        "tools": ["list_all_cards", "get_card"],
    },
]


def run_all(tool_filter=None, group_filter=None):
    """运行所有测试"""
    print(c("=" * 60, COLOR_BOLD))
    print(c("  SakuraNav MCP 自动化测试", COLOR_BOLD))
    print(c("=" * 60, COLOR_BOLD))
    print("  目标: {}/api/mcp".format(BASE_URL))
    print("  时间: {}".format(time.strftime("%Y-%m-%d %H:%M:%S")))
    if tool_filter:
        print("  过滤工具: {}".format(tool_filter))
    if group_filter:
        print("  过滤分组: {}".format(group_filter))
    print()

    for group in TEST_GROUPS:
        # 如果指定了 --tool 过滤
        if tool_filter:
            if tool_filter not in group["tools"]:
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
    global BASE_URL, TOKEN, _sse_client

    parser = argparse.ArgumentParser(description="SakuraNav MCP 自动化测试脚本")
    parser.add_argument("--url", required=True, help="站点根地址（如 https://your-site.com）")
    parser.add_argument("--token", required=True, help="API Token（sak_xxx）")
    parser.add_argument("--tool", help="只测试指定 MCP 工具（如 list_tags）")
    parser.add_argument("--group", help="只测试指定分组（tags/site-cards/social-cards/note-cards/snapshots/data/cards）")

    args = parser.parse_args()
    BASE_URL = args.url.rstrip("/")
    TOKEN = args.token

    enable_color()

    # 建立 SSE 连接
    print("正在建立 SSE 连接...")
    _sse_client = SseClient(BASE_URL, TOKEN)
    if not _sse_client.connect(timeout=15):
        print(c("连接失败: 无法建立 SSE 连接或获取 sessionId", COLOR_RED))
        sys.exit(1)
    print(c("SSE 连接成功! Session: {}...".format(_sse_client.session_id[:12]), COLOR_GREEN))

    # 验证连接 - 先初始化 MCP
    print("正在初始化 MCP 会话...")
    success, result, ms = mcp_request("initialize", {
        "protocolVersion": "2025-03-26",
        "capabilities": {},
        "clientInfo": {
            "name": "sakuranav-test-script",
            "version": "1.0.0",
        },
    })
    if not success:
        print(c("MCP 初始化失败: {}".format(str(result)[:200]), COLOR_RED))
        _sse_client.close()
        sys.exit(1)
    print(c("MCP 初始化成功! ({}ms)".format(ms), COLOR_GREEN))

    # 发送 initialized 通知（无 id，不期待响应）
    _sse_client.send_request({
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
    }, timeout=5)

    # 验证身份
    success, text, ms = call_tool("get_profile")
    if not success:
        print(c("认证失败: {}".format(str(text)[:200]), COLOR_RED))
        _sse_client.close()
        sys.exit(1)
    profile = parse_json(text) or {}
    print(c("认证成功! 用户: {} ({}ms)".format(profile.get("username", "?"), ms), COLOR_GREEN))
    print()

    try:
        failed = run_all(tool_filter=args.tool, group_filter=args.group)
    finally:
        _sse_client.close()

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
