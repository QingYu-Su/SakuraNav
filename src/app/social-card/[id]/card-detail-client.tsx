/**
 * 社交卡片详情客户端组件
 * @description 通用详情页，展示 ID/名称、复制按钮、可选二维码
 * 邮箱类型额外提供"发送邮件"按钮
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Copy, Check, ArrowLeft, Mail } from "lucide-react";
import { DynamicBackground } from "@/components/auth/dynamic-background";
import type { SocialCard, SocialCardType, ThemeMode } from "@/lib/base/types";
import { SOCIAL_CARD_TYPE_META } from "@/lib/base/types";

/** 根据卡片类型提取展示 ID */
function getDisplayId(card: SocialCard): string {
  switch (card.payload.type) {
    case "qq": return card.payload.qqNumber;
    case "wechat": return card.payload.wechatId;
    case "email": return card.payload.email;
    case "wechat-official": return card.payload.accountName;
    case "xiaohongshu": return card.payload.xhsId;
    case "douyin": return card.payload.douyinId;
    case "qq-group": return card.payload.groupNumber;
    case "enterprise-wechat": return card.payload.ewcId;
    default: return "";
  }
}

/** 根据卡片类型提取二维码 URL */
function getQrCodeUrl(card: SocialCard): string | undefined {
  return ("qrCodeUrl" in card.payload) ? card.payload.qrCodeUrl : undefined;
}

/** 根据卡片类型获取 ID 标签 */
function getIdLabel(cardType: SocialCardType): string {
  switch (cardType) {
    case "qq": return "QQ 号";
    case "wechat": return "微信号";
    case "email": return "邮箱地址";
    case "wechat-official": return "公众号名称";
    case "xiaohongshu": return "小红书号";
    case "douyin": return "抖音号";
    case "qq-group": return "QQ 群号";
    case "enterprise-wechat": return "企业微信号";
    default: return "";
  }
}

/** 根据卡片类型及是否有二维码，动态生成副标题 */
function getSubtitle(card: SocialCard): string {
  const hasQr = ("qrCodeUrl" in card.payload) && !!card.payload.qrCodeUrl;
  switch (card.payload.type) {
    case "qq": return hasQr ? "扫码或复制 QQ 号添加好友" : "复制 QQ 号添加好友";
    case "wechat": return hasQr ? "扫码或复制微信号添加好友" : "复制微信号添加好友";
    case "email": return "复制邮箱地址或直接发送邮件";
    case "wechat-official": return hasQr ? "扫码或复制公众号名称关注" : "复制公众号名称进行关注";
    case "xiaohongshu": return hasQr ? "扫码或复制小红书号添加关注" : "复制小红书号添加关注";
    case "douyin": return hasQr ? "扫码或复制抖音号添加关注" : "复制抖音号添加关注";
    case "qq-group": return hasQr ? "扫码或复制 QQ 群号加入群聊" : "复制 QQ 群号加入群聊";
    case "enterprise-wechat": return hasQr ? "扫码或复制企业微信号添加联系" : "复制企业微信号添加联系";
    default: return "";
  }
}

/** 根据卡片类型获取复制按钮文案 */
function getCopyLabel(cardType: SocialCardType): string {
  const label = getIdLabel(cardType);
  return `复制${label}`;
}

export function CardDetailClient({ card }: { card: SocialCard }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      const storedTheme = window.localStorage.getItem("sakura-theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }
    };
    const timer = setTimeout(updateTheme, 0);
    const observer = new MutationObserver(() => {
      const htmlTheme = document.documentElement.dataset.theme;
      if (htmlTheme === "light" || htmlTheme === "dark") setTheme(htmlTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("storage", updateTheme);
    return () => { clearTimeout(timer); window.removeEventListener("storage", updateTheme); observer.disconnect(); };
  }, []);

  const isDark = theme === "dark";
  const meta = SOCIAL_CARD_TYPE_META[card.cardType];
  const brandColor = meta.color;

  const displayId = getDisplayId(card);
  const qrCodeUrl = getQrCodeUrl(card);
  const idLabel = getIdLabel(card.cardType);
  const subtitleText = getSubtitle(card);
  const copyLabel = getCopyLabel(card.cardType);
  const isEmail = card.cardType === "email";

  const colors = {
    primaryText: isDark ? "#ffffff" : "#1a1f35",
    secondaryText: isDark ? "rgba(255,255,255,0.8)" : "rgba(26,31,53,0.8)",
    mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,31,53,0.6)",
    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    iconBg: isDark ? "rgba(255,255,255,0.1)" : `${brandColor}1a`,
    buttonBg: isDark ? "rgba(255,255,255,0.1)" : `${brandColor}1a`,
    buttonText: brandColor,
    buttonBorder: isDark ? `${brandColor}4d` : `${brandColor}33`,
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [displayId]);

  /** 邮箱：发送邮件 */
  const handleSendEmail = useCallback(() => {
    if (card.payload.type === "email") {
      window.location.href = `mailto:${card.payload.email}`;
    }
  }, [card.payload]);

  return (
    <main className="relative min-h-screen overflow-hidden" data-theme={theme}>
      <DynamicBackground />
      <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-8">
        <div className="animate-panel-rise w-full max-w-md">
          {/* Logo and title */}
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex items-center justify-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border shadow-2xl backdrop-blur-xl"
                style={{ borderColor: colors.border, background: colors.iconBg }}
              >
                <CardDetailTypeIcon cardType={card.cardType} isDark={isDark} size={36} />
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight transition-colors duration-300" style={{ color: colors.primaryText }}>
              {card.label}
            </h1>
            <p className="text-sm transition-colors duration-300" style={{ color: colors.mutedText }}>
              {subtitleText}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border p-8 shadow-2xl backdrop-blur-xl transition-all duration-300" style={{ borderColor: colors.border, background: colors.cardBg }}>
            {/* ID display */}
            <div className="mb-6 text-center">
              <p className="mb-2 text-sm transition-colors duration-300" style={{ color: colors.mutedText }}>{idLabel}</p>
              <p className="text-3xl font-bold tracking-wide break-all transition-colors duration-300" style={{ color: colors.primaryText }}>
                {displayId}
              </p>
            </div>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all duration-300"
              style={{ borderColor: colors.buttonBorder, background: colors.buttonBg, color: colors.buttonText }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已复制" : copyLabel}
            </button>

            {/* 邮箱类型：额外"发送邮件"按钮 */}
            {isEmail ? (
              <button
                type="button"
                onClick={handleSendEmail}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all duration-300"
                style={{ borderColor: colors.buttonBorder, background: colors.buttonBg, color: colors.buttonText }}
              >
                <Mail className="h-4 w-4" />
                发送邮件
              </button>
            ) : null}

            {/* QR Code */}
            {qrCodeUrl ? (
              <div className="flex flex-col items-center">
                <div className="overflow-hidden rounded-2xl border" style={{ borderColor: colors.border }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="二维码" className="h-56 w-56 object-contain" />
                </div>
                <p className="mt-3 text-xs transition-colors duration-300" style={{ color: colors.mutedText }}>
                  扫描二维码
                </p>
              </div>
            ) : null}

            {/* Back link */}
            <div className={cn("text-center", qrCodeUrl || isEmail ? "mt-6" : "mt-4")}>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm transition-colors duration-300 hover:opacity-80"
                style={{ color: colors.mutedText }}
              >
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/** cn 工具（避免额外 import） */
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/** 详情页图标（复用品牌 Logo） */
function CardDetailTypeIcon({ cardType, isDark, size = 48 }: { cardType: SocialCardType; isDark: boolean; size?: number }) {
  const meta = SOCIAL_CARD_TYPE_META[cardType];
  /** 深色品牌色在暗黑模式下使用 currentColor 自动适配 */
  const fill = (cardType === "github" || cardType === "douyin") && isDark ? "currentColor" : meta.color;
  switch (cardType) {
    case "qq":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
          <path d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673" />
        </svg>
      );
    case "qq-group":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      );
    case "wechat":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.127 6.127 0 0 1-.248-1.744c0-3.678 3.292-6.66 7.352-6.66.324 0 .642.023.956.06C16.646 4.821 13.003 2.188 8.691 2.188zm-2.87 4.401a.994.994 0 1 1 0 1.988.994.994 0 0 1 0-1.988zm5.742 0a.994.994 0 1 1 0 1.988.994.994 0 0 1 0-1.988zM16.88 9.188c-3.868 0-7.005 2.666-7.005 5.953 0 3.286 3.137 5.952 7.005 5.952.78 0 1.54-.113 2.27-.316a.717.717 0 0 1 .574.078l1.521.89a.262.262 0 0 0 .133.044.236.236 0 0 0 .232-.236c0-.058-.023-.114-.039-.17l-.312-1.186a.472.472 0 0 1 .17-.533C22.968 18.578 23.88 16.805 23.88 15.14c0-3.287-3.136-5.953-7-5.953zm-2.8 3.431a.795.795 0 1 1 0 1.59.795.795 0 0 1 0-1.59zm5.602 0a.795.795 0 1 1 0 1.59.795.795 0 0 1 0-1.59z" />
        </svg>
      );
    case "wechat-official":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
          <path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zm4.4-12.01c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z" />
        </svg>
      );
    case "email":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
        </svg>
      );
    case "xiaohongshu":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
          <path d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z" />
        </svg>
      );
    case "douyin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.88a8.28 8.28 0 0 0 4.76 1.5v-3.4a4.85 4.85 0 0 1-1-.29z" />
        </svg>
      );
    case "enterprise-wechat":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.127 6.127 0 0 1-.248-1.744c0-3.678 3.292-6.66 7.352-6.66.324 0 .642.023.956.06C16.646 4.821 13.003 2.188 8.691 2.188zm-2.87 4.401a.994.994 0 1 1 0 1.988.994.994 0 0 1 0-1.988zm5.742 0a.994.994 0 1 1 0 1.988.994.994 0 0 1 0-1.988zM16.88 9.188c-3.868 0-7.005 2.666-7.005 5.953 0 3.286 3.137 5.952 7.005 5.952.78 0 1.54-.113 2.27-.316a.717.717 0 0 1 .574.078l1.521.89a.262.262 0 0 0 .133.044.236.236 0 0 0 .232-.236c0-.058-.023-.114-.039-.17l-.312-1.186a.472.472 0 0 1 .17-.533C22.968 18.578 23.88 16.805 23.88 15.14c0-3.287-3.136-5.953-7-5.953zm-2.8 3.431a.795.795 0 1 1 0 1.59.795.795 0 0 1 0-1.59zm5.602 0a.795.795 0 1 1 0 1.59.795.795 0 0 1 0-1.59z" />
        </svg>
      );
    default:
      return null;
  }
}
