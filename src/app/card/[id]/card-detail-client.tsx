/**
 * 社交卡片详情客户端组件
 * @description 展示 QQ 号/微信号、复制按钮和可选的二维码，风格与登录页保持一致
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { DynamicBackground } from "@/components/auth/dynamic-background";
import type { SocialCard, ThemeMode } from "@/lib/base/types";
import { SOCIAL_CARD_TYPE_META } from "@/lib/base/types";

function QQIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#12B7F5">
      <path d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673" />
    </svg>
  );
}

function WechatIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#07C160">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.127 6.127 0 0 1-.248-1.744c0-3.678 3.292-6.66 7.352-6.66.324 0 .642.023.956.06C16.646 4.821 13.003 2.188 8.691 2.188zm-2.87 4.401a.994.994 0 1 1 0 1.988.994.994 0 0 1 0-1.988zm5.742 0a.994.994 0 1 1 0 1.988.994.994 0 0 1 0-1.988zM16.88 9.188c-3.868 0-7.005 2.666-7.005 5.953 0 3.286 3.137 5.952 7.005 5.952.78 0 1.54-.113 2.27-.316a.717.717 0 0 1 .574.078l1.521.89a.262.262 0 0 0 .133.044.236.236 0 0 0 .232-.236c0-.058-.023-.114-.039-.17l-.312-1.186a.472.472 0 0 1 .17-.533C22.968 18.578 23.88 16.805 23.88 15.14c0-3.287-3.136-5.953-7-5.953zm-2.8 3.431a.795.795 0 1 1 0 1.59.795.795 0 0 1 0-1.59zm5.602 0a.795.795 0 1 1 0 1.59.795.795 0 0 1 0-1.59z" />
    </svg>
  );
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

  const displayId =
    card.payload.type === "qq" ? card.payload.qqNumber :
    card.payload.type === "wechat" ? card.payload.wechatId :
    "";
  const qrCodeUrl = (card.payload.type === "qq" || card.payload.type === "wechat") ? card.payload.qrCodeUrl : undefined;
  const idLabel = card.cardType === "qq" ? "QQ 号" : "微信号";
  const copyLabel = card.cardType === "qq" ? "复制 QQ 号" : "复制微信号";
  const subtitleText = card.cardType === "qq" ? "扫码或复制 QQ 号添加好友" : "扫码或复制微信号添加好友";
  const qrAltText = card.cardType === "qq" ? "QQ 二维码" : "微信二维码";

  const colors = {
    primaryText: isDark ? "#ffffff" : "#1a1f35",
    secondaryText: isDark ? "rgba(255,255,255,0.8)" : "rgba(26,31,53,0.8)",
    mutedText: isDark ? "rgba(255,255,255,0.6)" : "rgba(26,31,53,0.6)",
    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    iconBg: isDark ? "rgba(255,255,255,0.1)" : `${brandColor}1a`,
    buttonBg: isDark ? "rgba(255,255,255,0.1)" : `${brandColor}1a`,
    buttonText: isDark ? brandColor : brandColor,
    buttonBorder: isDark ? `${brandColor}4d` : `${brandColor}33`,
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [displayId]);

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
                {card.cardType === "qq" ? <QQIcon size={36} /> : <WechatIcon size={36} />}
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
              <p className="text-3xl font-bold tracking-wide transition-colors duration-300" style={{ color: colors.primaryText }}>
                {displayId}
              </p>
            </div>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all duration-300"
              style={{ borderColor: colors.buttonBorder, background: colors.buttonBg, color: colors.buttonText }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已复制" : copyLabel}
            </button>

            {/* QR Code */}
            {qrCodeUrl ? (
              <div className="flex flex-col items-center">
                <div className="overflow-hidden rounded-2xl border" style={{ borderColor: colors.border }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt={qrAltText} className="h-56 w-56 object-contain" />
                </div>
                <p className="mt-3 text-xs transition-colors duration-300" style={{ color: colors.mutedText }}>
                  扫描二维码添加好友
                </p>
              </div>
            ) : null}

            {/* Back link */}
            <div className="mt-6 text-center">
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
