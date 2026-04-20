/**
 * 图片裁剪工具函数
 * @description 基于 Canvas API 的图片裁剪，支持旋转、圆角 Favicon 生成
 */

import type { Area } from "react-easy-crop";

/** 从 URL 创建 HTMLImageElement */
function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (err) => reject(err));
    // 仅对外部 URL 设置 crossOrigin（blob/data URL 不需要）
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.src = src;
  });
}

/** 计算旋转后的包围盒尺寸 */
function getRotatedSize(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * 裁剪图片并返回 Blob
 * @param src 图片源（blob URL / data URL）
 * @param crop 裁剪区域（像素坐标，由 react-easy-crop 提供）
 * @param rotation 旋转角度（度）
 * @param type 输出 MIME 类型
 * @param quality 输出质量（0-1，仅 JPEG 有效）
 * @param circular 是否应用圆形蒙版（适用于 Favicon 圆角输出）
 */
export async function getCroppedBlob(
  src: string,
  crop: Area,
  rotation = 0,
  type: string = "image/png",
  quality = 0.92,
  circular = false,
): Promise<Blob> {
  const image = await createImage(src);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const { width: rotW, height: rotH } = getRotatedSize(image.width, image.height, rotation);
  const rad = (rotation * Math.PI) / 180;

  // 绘制旋转后的完整图像
  canvas.width = rotW;
  canvas.height = rotH;
  ctx.translate(rotW / 2, rotH / 2);
  ctx.rotate(rad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  // 提取裁剪区域
  const cropCanvas = document.createElement("canvas");
  const cropCtx = cropCanvas.getContext("2d")!;
  cropCanvas.width = crop.width;
  cropCanvas.height = crop.height;

  if (circular) {
    // 应用圆形蒙版：先裁剪再通过 clip 限制为圆形区域
    cropCtx.beginPath();
    cropCtx.arc(crop.width / 2, crop.height / 2, Math.min(crop.width, crop.height) / 2, 0, Math.PI * 2);
    cropCtx.closePath();
    cropCtx.clip();
  }

  cropCtx.drawImage(
    canvas,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    cropCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob 失败"))),
      type,
      quality,
    );
  });
}

/* ============================================ */
/* 圆角 Favicon 生成                             */
/* ============================================ */

/** 圆角 Favicon 缓存，避免重复 Canvas 计算 */
const roundedFaviconCache = new Map<string, string>();

/**
 * 将图片 URL 转换为圆角方形的 data URL
 * @param src 原始图片 URL
 * @param size 输出尺寸（像素），默认 64
 * @param borderRadius 圆角比例（0-0.5），默认 0.2 即 20%
 * @returns 圆角处理后的 data URL，失败时返回原图 URL
 */
async function toRoundedDataUrl(src: string, size = 64, borderRadius = 0.2): Promise<string> {
  const cacheKey = `${src}|${size}|${borderRadius}`;
  const cached = roundedFaviconCache.get(cacheKey);
  if (cached) return cached;

  return new Promise<string>((resolve) => {
    const img = new Image();
    // 仅对外部 URL 设置 crossOrigin，同源图片不需要（否则可能导致 Canvas 污染）
    if (src.startsWith("http://") || src.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;

        // 绘制圆角矩形路径并裁剪
        const r = size * borderRadius;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(size - r, 0);
        ctx.quadraticCurveTo(size, 0, size, r);
        ctx.lineTo(size, size - r);
        ctx.quadraticCurveTo(size, size, size - r, size);
        ctx.lineTo(r, size);
        ctx.quadraticCurveTo(0, size, 0, size - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, 0, 0, size, size);

        const dataUrl = canvas.toDataURL("image/png");
        roundedFaviconCache.set(cacheKey, dataUrl);
        resolve(dataUrl);
      } catch {
        // Canvas 处理失败时回退原图
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

/**
 * 为浏览器标签页应用圆角 Favicon
 * @param faviconUrl 原始 favicon 图片 URL
 */
export async function applyRoundedFavicon(faviconUrl: string): Promise<void> {
  const roundedUrl = await toRoundedDataUrl(faviconUrl);
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = roundedUrl;
}
