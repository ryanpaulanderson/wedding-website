import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Image, { type ImageProps } from "next/image";
import {
  getImageCatalog,
  mergePreparedImageCache,
  resolveImageFromCatalog,
  type ImageAssetId,
  type ImageVariantId,
} from "@/lib/image-catalog";

type ManagedImageProps<AssetId extends ImageAssetId> = Omit<
  ImageProps,
  | "src"
  | "alt"
  | "width"
  | "height"
  | "quality"
  | "placeholder"
  | "blurDataURL"
  | "sizes"
  | "preload"
> & {
  assetId: AssetId;
  variantId: ImageVariantId<AssetId>;
  sizes: string;
  preload?: boolean;
};

function localPreviewExists(localSrc: string): boolean {
  const relativePath = localSrc.replace(/^\/+/, "");
  return existsSync(path.join(process.cwd(), "public", relativePath));
}

function getRuntimeImageCatalog() {
  const catalog = getImageCatalog();
  if (process.env.NODE_ENV !== "development") {
    return catalog;
  }

  const cachePath = path.join(process.cwd(), ".image-cache", "prepared-images.json");
  try {
    const preparedCache: unknown = JSON.parse(readFileSync(cachePath, "utf8"));
    return mergePreparedImageCache(catalog, preparedCache);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return catalog;
    }
    throw error;
  }
}

export function ManagedImage<AssetId extends ImageAssetId>({
  assetId,
  variantId,
  sizes,
  preload = false,
  ...imageProps
}: ManagedImageProps<AssetId>) {
  const image = resolveImageFromCatalog(getRuntimeImageCatalog(), assetId, variantId, {
    useLocalPreview: process.env.NODE_ENV === "development",
    localPreviewExists,
  });

  return (
    <Image
      {...imageProps}
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      quality={image.quality}
      placeholder="blur"
      blurDataURL={image.blurDataURL}
      sizes={sizes}
      preload={preload}
    />
  );
}
