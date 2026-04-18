/**
 * 图片裁剪工具函数
 * @description 基于 Canvas API 的图片裁剪，支持旋转
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
 */
export async function getCroppedBlob(
  src: string,
  crop: Area,
  rotation = 0,
  type: string = "image/png",
  quality = 0.92,
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
