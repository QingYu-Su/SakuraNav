/**
 * 社交卡片编辑器
 * @description 编辑社交卡片的具体信息（不同卡片类型有不同的字段）
 */

"use client";

import { useState, useRef } from "react";
import { X, Trash2, ImagePlus, LoaderCircle, Upload } from "lucide-react";
import type { SocialCardType, ThemeMode } from "@/lib/base/types";
import { SOCIAL_CARD_TYPE_META } from "@/lib/base/types";
import type { CardFormState } from "@/hooks/use-social-cards";
import { cn } from "@/lib/utils/utils";
import { getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass, getDialogInputClass, getDialogPrimaryBtnClass } from "../sakura-nav/style-helpers";
import { uploadIconFile, uploadIconByUrl } from "@/lib/utils/icon-utils";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";

type SocialCardEditorProps = {
  open: boolean;
  themeMode: ThemeMode;
  cardForm: CardFormState;
  setCardForm: React.Dispatch<React.SetStateAction<CardFormState | null>>;
  onSubmit: () => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
};

/** 二维码上传 Tab 类型 */
type QrUploadTab = "file" | "url";

/** 根据卡片类型渲染对应的输入字段 */
function CardTypeFields({
  cardType,
  form,
  onChange,
  onQrCodeChange,
  themeMode,
}: {
  cardType: SocialCardType;
  form: CardFormState;
  onChange: (field: string, value: string) => void;
  onQrCodeChange: (value: string) => void;
  themeMode: ThemeMode;
}) {
  const inputClass = cn(
    "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    themeMode === "light"
      ? "border-slate-200 bg-white focus:border-slate-400"
      : "border-white/12 bg-white/6 focus:border-white/30",
  );

  switch (cardType) {
    case "qq":
      return (
        <QrIdFields
          form={form} onChange={onChange} onQrCodeChange={onQrCodeChange} themeMode={themeMode} inputClass={inputClass}
          fieldLabel="QQ 号" fieldPlaceholder="请输入 QQ 号" fieldKey="qqNumber" qrLabel="QQ 二维码图片"
          hint="点击卡片后将打开 QQ 联系页面，展示 QQ 号和二维码" required
        />
      );
    case "wechat":
      return (
        <QrIdFields
          form={form} onChange={onChange} onQrCodeChange={onQrCodeChange} themeMode={themeMode} inputClass={inputClass}
          fieldLabel="微信号" fieldPlaceholder="请输入微信号" fieldKey="wechatId" qrLabel="微信二维码图片"
          hint="点击卡片后将打开微信联系页面，展示微信号和二维码" required
        />
      );
    case "email":
      return (
        <div>
          <label className={cn("mb-2 block text-sm font-medium", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
            邮箱地址
          </label>
          <input
            type="email"
            value={form.fieldValue}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="请输入邮箱地址"
            className={inputClass}
          />
          <p className={cn("mt-2 text-xs", themeMode === "light" ? "text-slate-400" : "text-white/40")}>
            点击卡片将打开邮箱详情页，可复制邮箱地址或发送邮件
          </p>
        </div>
      );
    case "bilibili":
      return (
        <UrlFields label="B站个人空间 URL" placeholder="https://space.bilibili.com/xxxxxx" hint="点击卡片将跳转到 B站个人空间" form={form} onChange={onChange} inputClass={inputClass} themeMode={themeMode} />
      );
    case "github":
      return (
        <UrlFields label="GitHub 个人主页 URL" placeholder="https://github.com/xxxxxx" hint="点击卡片将跳转到 GitHub 个人主页" form={form} onChange={onChange} inputClass={inputClass} themeMode={themeMode} />
      );
    case "blog":
      return (
        <UrlFields label="博客 URL" placeholder="https://your-blog.com" hint="点击卡片将跳转到博客页面" form={form} onChange={onChange} inputClass={inputClass} themeMode={themeMode} />
      );
    case "wechat-official":
      return (
        <QrIdFields
          form={form} onChange={onChange} onQrCodeChange={onQrCodeChange} themeMode={themeMode} inputClass={inputClass}
          fieldLabel="公众号名称" fieldPlaceholder="请输入公众号名称" fieldKey="accountName" qrLabel="公众号二维码图片（选填）"
          hint="点击卡片后将打开公众号详情页，展示公众号名称；二维码为可选" required
        />
      );
    case "telegram":
      return (
        <UrlFields label="Telegram 频道 URL" placeholder="https://t.me/your_channel" hint="点击卡片将跳转到 Telegram 频道" form={form} onChange={onChange} inputClass={inputClass} themeMode={themeMode} />
      );
    case "xiaohongshu":
      return (
        <QrIdFields
          form={form} onChange={onChange} onQrCodeChange={onQrCodeChange} themeMode={themeMode} inputClass={inputClass}
          fieldLabel="小红书号" fieldPlaceholder="请输入小红书号" fieldKey="xhsId" qrLabel="小红书二维码图片（选填）"
          hint="点击卡片后将打开小红书详情页，展示小红书号；二维码为可选" required
        />
      );
    case "douyin":
      return (
        <QrIdFields
          form={form} onChange={onChange} onQrCodeChange={onQrCodeChange} themeMode={themeMode} inputClass={inputClass}
          fieldLabel="抖音号" fieldPlaceholder="请输入抖音号" fieldKey="douyinId" qrLabel="抖音二维码图片（选填）"
          hint="点击卡片后将打开抖音详情页，展示抖音号；二维码为可选" required
        />
      );
    case "qq-group":
      return (
        <QrIdFields
          form={form} onChange={onChange} onQrCodeChange={onQrCodeChange} themeMode={themeMode} inputClass={inputClass}
          fieldLabel="QQ 群号" fieldPlaceholder="请输入 QQ 群号" fieldKey="groupNumber" qrLabel="QQ 群二维码图片（选填）"
          hint="点击卡片后将打开 QQ 群详情页，展示群号；二维码为可选" required
        />
      );
    case "enterprise-wechat":
      return (
        <QrIdFields
          form={form} onChange={onChange} onQrCodeChange={onQrCodeChange} themeMode={themeMode} inputClass={inputClass}
          fieldLabel="企业微信号" fieldPlaceholder="请输入企业微信号" fieldKey="ewcId" qrLabel="企业微信二维码图片（选填）"
          hint="点击卡片后将打开企业微信详情页，展示企业微信号；二维码为可选" required
        />
      );
  }
}

/** URL 类型字段（B站/GitHub/博客/Telegram 等只需输入 URL 的卡片） */
function UrlFields({ label, placeholder, hint, form, onChange, inputClass, themeMode }: {
  label: string; placeholder: string; hint: string;
  form: CardFormState; onChange: (field: string, value: string) => void; inputClass: string; themeMode: ThemeMode;
}) {
  return (
    <div>
      <label className={cn("mb-2 block text-sm font-medium", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
        {label}
      </label>
      <input
        type="url"
        value={form.fieldValue}
        onChange={(e) => onChange("url", e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      <p className={cn("mt-2 text-xs", themeMode === "light" ? "text-slate-400" : "text-white/40")}>
        {hint}
      </p>
    </div>
  );
}

/** 通用「ID + 二维码」字段（QQ/微信/公众号/小红书/抖音/QQ群/企业微信共用） */
function QrIdFields({
  form, onChange, onQrCodeChange, themeMode, inputClass,
  fieldLabel, fieldPlaceholder, fieldKey, qrLabel, hint, required,
}: {
  form: CardFormState;
  onChange: (field: string, value: string) => void;
  onQrCodeChange: (value: string) => void;
  themeMode: ThemeMode;
  inputClass: string;
  fieldLabel: string;
  fieldPlaceholder: string;
  fieldKey: string;
  qrLabel: string;
  hint: string;
  required?: boolean;
}) {
  const [qrUploadTab, setQrUploadTab] = useState<QrUploadTab>("file");
  const [qrUploading, setQrUploading] = useState(false);
  const [qrUrlValue, setQrUrlValue] = useState("");
  const [qrUrlError, setQrUrlError] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const hasQrCode = !!form.qrCodeUrl;

  function handleQrFileSelect(file: File) {
    setCropImageSrc(URL.createObjectURL(file));
  }

  async function handleQrCropConfirm(blob: Blob) {
    const src = cropImageSrc;
    setCropImageSrc(null);
    if (src) URL.revokeObjectURL(src);
    setQrUploading(true);
    try {
      const file = new File([blob], "qr-code.png", { type: "image/png" });
      const asset = await uploadIconFile(file);
      onQrCodeChange(asset.url);
    } catch (error) {
      console.error("Upload QR code failed:", error);
    } finally {
      setQrUploading(false);
    }
  }

  function handleQrCropCancel() {
    const src = cropImageSrc;
    setCropImageSrc(null);
    if (src) URL.revokeObjectURL(src);
  }

  async function handleQrUploadByUrl(url: string) {
    setQrUploading(true);
    try {
      const asset = await uploadIconByUrl(url);
      onQrCodeChange(asset.url);
      setQrUrlValue("");
      setQrUrlError("");
    } catch (error) {
      setQrUrlError(error instanceof Error ? error.message : "上传失败");
    } finally {
      setQrUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={cn("mb-2 block text-sm font-medium", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
          {fieldLabel} {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type="text"
          value={form.fieldValue}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={fieldPlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label className={cn("mb-2 block text-sm font-medium", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
          {qrLabel}
        </label>

        {hasQrCode ? (
          <div className="flex items-center gap-3">
            <div className={cn("h-20 w-20 overflow-hidden rounded-2xl border", themeMode === "light" ? "border-slate-200 bg-slate-50" : "border-white/12 bg-white/4")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.qrCodeUrl} alt="二维码" className="h-full w-full object-contain" />
            </div>
            <button
              type="button"
              onClick={() => onQrCodeChange("")}
              className={cn("rounded-xl px-3 py-1.5 text-xs font-medium transition", themeMode === "light" ? "text-red-500 hover:bg-red-50" : "text-red-400 hover:bg-red-500/10")}
            >
              移除
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <button type="button" onClick={() => setQrUploadTab("file")} className={cn("flex-1 rounded-xl px-4 py-2 text-sm font-medium transition", qrUploadTab === "file" ? (themeMode === "light" ? "bg-slate-900 text-white" : "bg-white/12 text-white") : (themeMode === "light" ? "bg-slate-50 text-slate-500 hover:bg-slate-100" : "bg-white/4 text-white/50 hover:bg-white/8"))}>
                本地上传
              </button>
              <button type="button" onClick={() => setQrUploadTab("url")} className={cn("flex-1 rounded-xl px-4 py-2 text-sm font-medium transition", qrUploadTab === "url" ? (themeMode === "light" ? "bg-slate-900 text-white" : "bg-white/12 text-white") : (themeMode === "light" ? "bg-slate-50 text-slate-500 hover:bg-slate-100" : "bg-white/4 text-white/50 hover:bg-white/8"))}>
                指定 URL
              </button>
            </div>

            {qrUploadTab === "file" ? (
              <button type="button" onClick={() => qrFileInputRef.current?.click()} disabled={qrUploading} className={cn("inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm transition disabled:opacity-60", themeMode === "light" ? "border-slate-300/60 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100" : "border-white/12 bg-white/4 text-white/50 hover:border-white/20 hover:bg-white/8")}>
                {qrUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {qrUploading ? "上传中..." : "点击选择二维码图片"}
              </button>
            ) : (
              <div>
                <input value={qrUrlValue} onChange={(e) => { setQrUrlValue(e.target.value); if (qrUrlError) setQrUrlError(""); }} placeholder="https://example.com/qrcode.png" className={cn("w-full rounded-2xl border px-4 py-3 text-sm outline-none", getDialogInputClass(themeMode))} />
                {qrUrlError ? <p className={cn("mt-2 text-sm", themeMode === "light" ? "text-red-500" : "text-rose-300")}>{qrUrlError}</p> : null}
                <button type="button" onClick={() => void handleQrUploadByUrl(qrUrlValue.trim())} disabled={!qrUrlValue.trim() || qrUploading} className={cn("mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60", getDialogPrimaryBtnClass(themeMode))}>
                  {qrUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  确认上传
                </button>
              </div>
            )}

            <input ref={qrFileInputRef} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleQrFileSelect(file); e.currentTarget.value = ""; }} className="hidden" />

            {cropImageSrc ? (
              <ImageCropDialog imageSrc={cropImageSrc} cropShape="rect" aspectRatio={1} onConfirm={(blob) => void handleQrCropConfirm(blob)} onCancel={handleQrCropCancel} themeMode={themeMode} />
            ) : null}
          </>
        )}

        <p className={cn("mt-2 text-xs", themeMode === "light" ? "text-slate-400" : "text-white/40")}>
          {hint}
        </p>
      </div>
    </div>
  );
}

export function SocialCardEditor({
  open,
  themeMode,
  cardForm,
  setCardForm,
  onSubmit,
  onDelete,
  onClose,
}: SocialCardEditorProps) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const meta = SOCIAL_CARD_TYPE_META[cardForm.cardType];
  const isEdit = !!cardForm.id;

  function handleFieldChange(field: string, value: string) {
    setCardForm((prev) => prev ? { ...prev, fieldValue: value } : prev);
  }

  function handleQrCodeChange(value: string) {
    setCardForm((prev) => prev ? { ...prev, qrCodeUrl: value || undefined } : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit();
    } finally {
      setBusy(false);
    }
  }

  const btnPrimary = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition",
    "bg-slate-900 text-white hover:bg-slate-800",
    themeMode === "dark" && "bg-white/16 hover:bg-white/24",
    busy && "opacity-60 pointer-events-none",
  );

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[520px] overflow-hidden rounded-[34px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {isEdit ? `编辑社交卡片` : `新建社交卡片`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto px-6 py-6">
          {/* 卡片名称（固定，显示） */}
          <div className="mb-5">
            <label className={cn("mb-2 block text-sm font-medium", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
              卡片名称
            </label>
            <div className={cn(
              "w-full rounded-2xl border px-4 py-3 text-sm",
              themeMode === "light" ? "border-slate-200 bg-slate-50 text-slate-400" : "border-white/8 bg-white/3 text-white/40",
            )}>
              {meta.label}
            </div>
            <p className={cn("mt-1 text-xs", themeMode === "light" ? "text-slate-400" : "text-white/40")}>
              卡片名称固定，不可修改
            </p>
          </div>

          {/* 类型特定字段 */}
          <div className="mb-5">
            <CardTypeFields
              cardType={cardForm.cardType}
              form={cardForm}
              onChange={handleFieldChange}
              onQrCodeChange={handleQrCodeChange}
              themeMode={themeMode}
            />
          </div>

          {/* 提示文字（自定义卡片上显示的引导文案） */}
          <div className="mb-5">
            <label className={cn("mb-2 block text-sm font-medium", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
              提示文字
            </label>
            <input
              type="text"
              value={cardForm.hint ?? ""}
              onChange={(e) => setCardForm((prev) => prev ? { ...prev, hint: e.target.value } : prev)}
              placeholder="自定义提示文字（选填）"
              maxLength={40}
              className={cn(
                "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
                themeMode === "light"
                  ? "border-slate-200 bg-white focus:border-slate-400"
                  : "border-white/12 bg-white/6 focus:border-white/30",
              )}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-2">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={() => { onDelete(); }}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            ) : <div />}
            <button type="submit" className={btnPrimary}>
              {isEdit ? "保存修改" : "创建社交卡片"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
