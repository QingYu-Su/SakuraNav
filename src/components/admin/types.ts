import { type Dispatch, type SetStateAction } from "react";
import { type FontPresetKey, type Tag, type ThemeMode } from "@/lib/types";

export type AdminSection = "sites" | "tags" | "appearance" | "config";
export type AdminGroup = "create" | "edit";

export type SiteFormState = {
  id?: string;
  name: string;
  url: string;
  description: string | null;
  iconUrl: string;
  tagIds: string[];
};

export type TagFormState = {
  id?: string;
  name: string;
  isHidden: boolean;
  logoUrl: string;
};

export type AppearanceDraft = Record<
  ThemeMode,
  {
    desktopWallpaperAssetId: string | null;
    desktopWallpaperUrl: string | null;
    mobileWallpaperAssetId: string | null;
    mobileWallpaperUrl: string | null;
    fontPreset: FontPresetKey;
    fontSize: number;
    overlayOpacity: number;
    textColor: string;
    logoAssetId: string | null;
    logoUrl: string | null;
    faviconAssetId: string | null;
    faviconUrl: string | null;
    desktopCardFrosted: boolean;
    mobileCardFrosted: boolean;
    isDefault: boolean;
  }
>;

export const defaultSiteForm: SiteFormState = {
  name: "",
  url: "",
  description: null,
  iconUrl: "",
  tagIds: [],
};

export const defaultTagForm: TagFormState = {
  name: "",
  isHidden: false,
  logoUrl: "",
};
