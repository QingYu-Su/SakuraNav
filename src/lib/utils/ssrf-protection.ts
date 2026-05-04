/**
 * @description SSRF 防护工具 — 过滤对私有/保留 IP 地址的请求
 * 防止攻击者通过服务端 fetch 探测内网服务
 */

import dns from "node:dns/promises";

/** 私有 IP CIDR 范围（RFC 1918 + 回环 + 链路本地 + 云元数据） */
const PRIVATE_IP_RANGES: Array<{ network: number; mask: number }> = [
  // 10.0.0.0/8
  { network: ipToInt(10, 0, 0, 0), mask: 0xFF000000 },
  // 172.16.0.0/12
  { network: ipToInt(172, 16, 0, 0), mask: 0xFFF00000 },
  // 192.168.0.0/16
  { network: ipToInt(192, 168, 0, 0), mask: 0xFFFF0000 },
  // 127.0.0.0/8 (loopback)
  { network: ipToInt(127, 0, 0, 0), mask: 0xFF000000 },
  // 169.254.0.0/16 (link-local / cloud metadata)
  { network: ipToInt(169, 254, 0, 0), mask: 0xFFFF0000 },
  // 0.0.0.0/8 (current network)
  { network: ipToInt(0, 0, 0, 0), mask: 0xFF000000 },
];

function ipToInt(a: number, b: number, c: number, d: number): number {
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

/**
 * 检查 IPv4 地址是否属于私有/保留范围
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  const octets = parts.map(Number);
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return false;

  const int = ipToInt(octets[0], octets[1], octets[2], octets[3]);

  return PRIVATE_IP_RANGES.some(
    (range) => (int & range.mask) === range.network,
  );
}

/**
 * 检查 URL 是否指向私有/保留地址
 *
 * 防护策略：
 * 1. 仅允许 http/https 协议
 * 2. 解析 hostname 进行 DNS 查询获取实际 IP
 * 3. 检查 IP 是否属于私有范围
 *
 * @returns true = 安全（公网地址），false = 危险（私有地址）
 */
export async function isUrlSafe(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);

    // 仅允许 http/https 协议
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname;

    // IPv6 地址检查
    if (hostname.startsWith("[") || hostname.includes(":")) {
      // 简化处理：拒绝 IPv6 回环和链路本地
      const lower = hostname.toLowerCase();
      if (lower.includes("::1") || lower.startsWith("fe80:") || lower === "[::1]") {
        return false;
      }
      // 对于其他 IPv6 地址，允许通过（完整 IPv6 私有地址检查较复杂）
      return true;
    }

    // IPv4 直接检查
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return !isPrivateIPv4(hostname);
    }

    // 域名：DNS 解析后检查
    try {
      const result = await dns.resolve4(hostname);
      // 只要任一解析结果为私有 IP 即拒绝
      return !result.some((ip) => isPrivateIPv4(ip));
    } catch {
      // DNS 解析失败可能是域名不存在，允许通过（fetch 会自行失败）
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * 创建带 SSRF 防护的 fetch 包装函数
 * @returns Response 或 null（如果 URL 不安全）
 */
export async function safeFetch(
  url: string,
  init?: RequestInit,
): Promise<{ response: Response | null; blocked: boolean }> {
  const safe = await isUrlSafe(url);
  if (!safe) {
    return { response: null, blocked: true };
  }

  const response = await fetch(url, init);
  return { response, blocked: false };
}
