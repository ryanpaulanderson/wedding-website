import imageCatalogValue from "@/generated/image-catalog.json";

export type ImageCatalogVariant = {
  url: string;
  pathname: string;
  localSrc: string;
  width: number;
  height: number;
  quality: number;
  blurDataURL: string;
  contentHash: string;
};

export type ImageCatalog = {
  version: 1;
  assets: Record<
    string,
    {
      alt: string;
      variants: Record<string, ImageCatalogVariant>;
    }
  >;
};

const imageCatalog = imageCatalogValue as ImageCatalog;

type GeneratedCatalog = typeof imageCatalogValue;
type GeneratedAssets = GeneratedCatalog["assets"];
type GeneratedAssetId = keyof GeneratedAssets & string;

export type ImageAssetId = [GeneratedAssetId] extends [never] ? string : GeneratedAssetId;

export type ImageVariantId<AssetId extends ImageAssetId> = AssetId extends keyof GeneratedAssets
  ? keyof GeneratedAssets[AssetId]["variants"] & string
  : string;

export type ResolvedImage = ImageCatalogVariant & {
  alt: string;
  src: string;
};

export function resolveImageFromCatalog(
  catalog: ImageCatalog,
  assetId: string,
  variantId: string,
  options: {
    useLocalPreview: boolean;
    localPreviewExists: (localSrc: string) => boolean;
  },
): ResolvedImage {
  const asset = catalog.assets[assetId];
  if (!asset) {
    throw new Error(`Unknown managed image asset "${assetId}".`);
  }

  const variant = asset.variants[variantId];
  if (!variant) {
    throw new Error(`Unknown managed image variant "${assetId}.${variantId}".`);
  }

  const useLocalSource = options.useLocalPreview && options.localPreviewExists(variant.localSrc);

  return {
    ...variant,
    alt: asset.alt,
    src: useLocalSource ? variant.localSrc : variant.url,
  };
}

export function getImageCatalog(): ImageCatalog {
  return imageCatalog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergePreparedImageCache(catalog: ImageCatalog, value: unknown): ImageCatalog {
  if (
    !isRecord(value) ||
    !Array.isArray(value.variants) ||
    !Array.isArray(value.configuredAssetIds) ||
    !value.configuredAssetIds.every((assetId) => typeof assetId === "string") ||
    !Array.isArray(value.skippedAssetIds) ||
    !value.skippedAssetIds.every((assetId) => typeof assetId === "string")
  ) {
    throw new Error("The local prepared image cache is invalid; run `pnpm images:prepare` again.");
  }

  const configuredAssetIds = new Set(value.configuredAssetIds);
  const skippedAssetIds = new Set(value.skippedAssetIds);
  const merged: ImageCatalog = { version: 1, assets: {} };

  for (const assetId of skippedAssetIds) {
    if (!configuredAssetIds.has(assetId)) {
      throw new Error(
        "The local prepared image cache is invalid; run `pnpm images:prepare` again.",
      );
    }

    const existingAsset = catalog.assets[assetId];
    if (existingAsset) {
      merged.assets[assetId] = structuredClone(existingAsset);
    }
  }

  for (const rawVariant of value.variants) {
    if (
      !isRecord(rawVariant) ||
      typeof rawVariant.assetId !== "string" ||
      typeof rawVariant.variantId !== "string" ||
      typeof rawVariant.alt !== "string" ||
      typeof rawVariant.pathname !== "string" ||
      typeof rawVariant.localSrc !== "string" ||
      typeof rawVariant.width !== "number" ||
      typeof rawVariant.height !== "number" ||
      typeof rawVariant.quality !== "number" ||
      typeof rawVariant.blurDataURL !== "string" ||
      typeof rawVariant.contentHash !== "string"
    ) {
      throw new Error(
        "The local prepared image cache is invalid; run `pnpm images:prepare` again.",
      );
    }

    if (!configuredAssetIds.has(rawVariant.assetId) || skippedAssetIds.has(rawVariant.assetId)) {
      throw new Error(
        "The local prepared image cache is invalid; run `pnpm images:prepare` again.",
      );
    }

    const existingVariant = catalog.assets[rawVariant.assetId]?.variants[rawVariant.variantId];
    const asset = (merged.assets[rawVariant.assetId] ??= {
      alt: rawVariant.alt,
      variants: {},
    });
    asset.alt = rawVariant.alt;
    asset.variants[rawVariant.variantId] = {
      url: existingVariant?.url ?? rawVariant.localSrc,
      pathname: rawVariant.pathname,
      localSrc: rawVariant.localSrc,
      width: rawVariant.width,
      height: rawVariant.height,
      quality: rawVariant.quality,
      blurDataURL: rawVariant.blurDataURL,
      contentHash: rawVariant.contentHash,
    };
  }

  return merged;
}
