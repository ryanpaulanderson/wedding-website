import { describe, expect, it, vi } from "vitest";
import {
  mergePreparedImageCache,
  resolveImageFromCatalog,
  type ImageCatalog,
} from "./image-catalog";

const catalog: ImageCatalog = {
  version: 1,
  assets: {
    "couple-portrait": {
      alt: "A couple standing together outdoors",
      variants: {
        homeHero: {
          url: "https://example.public.blob.vercel-storage.com/wedding-images/couple-portrait/homeHero-hash.webp",
          pathname: "wedding-images/couple-portrait/homeHero-hash.webp",
          localSrc: "/_local-images/couple-portrait/homeHero-hash.webp",
          width: 1600,
          height: 900,
          quality: 88,
          blurDataURL: "data:image/webp;base64,dGVzdA==",
          contentHash: "hash",
        },
      },
    },
  },
};

describe("resolveImageFromCatalog", () => {
  it("uses a prepared local variant during development and preserves its accessible alt text", () => {
    const localPreviewExists = vi.fn(() => true);

    const image = resolveImageFromCatalog(catalog, "couple-portrait", "homeHero", {
      useLocalPreview: true,
      localPreviewExists,
    });

    expect(image.src).toBe("/_local-images/couple-portrait/homeHero-hash.webp");
    expect(image.alt).toBe("A couple standing together outdoors");
    expect(localPreviewExists).toHaveBeenCalledOnce();
  });

  it("falls back to the public Blob URL when the local derivative is unavailable", () => {
    const image = resolveImageFromCatalog(catalog, "couple-portrait", "homeHero", {
      useLocalPreview: true,
      localPreviewExists: () => false,
    });

    expect(image.src).toBe(
      "https://example.public.blob.vercel-storage.com/wedding-images/couple-portrait/homeHero-hash.webp",
    );
  });

  it("rejects unknown asset and variant keys", () => {
    const options = { useLocalPreview: false, localPreviewExists: () => false };

    expect(() => resolveImageFromCatalog(catalog, "missing", "homeHero", options)).toThrow(
      'Unknown managed image asset "missing".',
    );
    expect(() => resolveImageFromCatalog(catalog, "couple-portrait", "missing", options)).toThrow(
      'Unknown managed image variant "couple-portrait.missing".',
    );
  });
});

describe("mergePreparedImageCache", () => {
  it("makes a prepared local-only variant addressable before its first Blob sync", () => {
    const localCatalog = mergePreparedImageCache(
      { version: 1, assets: {} },
      {
        variants: [
          {
            assetId: "stock-couple",
            variantId: "homeHero",
            alt: "A stock couple outdoors",
            pathname: "wedding-images/stock-couple/homeHero-hash.webp",
            localSrc: "/_local-images/stock-couple/homeHero-hash.webp",
            width: 1600,
            height: 900,
            quality: 88,
            blurDataURL: "data:image/webp;base64,dGVzdA==",
            contentHash: "hash",
          },
        ],
      },
    );

    const image = resolveImageFromCatalog(localCatalog, "stock-couple", "homeHero", {
      useLocalPreview: true,
      localPreviewExists: () => true,
    });

    expect(image.src).toBe("/_local-images/stock-couple/homeHero-hash.webp");
    expect(image.alt).toBe("A stock couple outdoors");
  });

  it("rejects malformed cache data", () => {
    expect(() => mergePreparedImageCache(catalog, { variants: [{}] })).toThrow(
      "local prepared image cache is invalid",
    );
  });
});
