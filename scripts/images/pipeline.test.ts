// @vitest-environment node

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateFocalCrop,
  getDefaultPipelinePaths,
  parseImageConfig,
  prepareImages,
  pruneImages,
  syncImages,
  type BlobClient,
  type PipelinePaths,
} from "./pipeline";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createTestPaths(): Promise<PipelinePaths> {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), "wedding-images-"));
  temporaryDirectories.push(rootDirectory);
  const paths = getDefaultPipelinePaths(rootDirectory);
  await mkdir(paths.sourceDirectory, { recursive: true });
  await mkdir(path.dirname(paths.catalogFile), { recursive: true });
  await writeFile(paths.catalogFile, '{"version":1,"assets":{}}\n', "utf8");
  return paths;
}

async function writeConfiguredImage(
  paths: PipelinePaths,
  name: string,
  config: Record<string, unknown>,
  dimensions = { width: 2000, height: 1400 },
): Promise<void> {
  await sharp({
    create: {
      ...dimensions,
      channels: 3,
      background: { r: 80, g: 120, b: 160 },
    },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toFile(path.join(paths.sourceDirectory, `${name}.jpg`));
  await writeFile(
    path.join(paths.sourceDirectory, `${name}.image.json`),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  );
}

function imageConfig(
  id: string,
  variants: Record<string, Record<string, unknown>> = {
    homeHero: {
      width: 800,
      height: 450,
      focalPoint: { x: 0.5, y: 0.5 },
    },
  },
): Record<string, unknown> {
  return {
    $schema: "../schemas/image-config.schema.json",
    id,
    alt: "A test couple outdoors",
    variants,
  };
}

function createBlobClient(overrides: Partial<BlobClient> = {}): BlobClient {
  return {
    list: vi.fn(async () => ({ blobs: [], hasMore: false })),
    put: vi.fn(async (pathname) => ({
      pathname,
      url: `https://test.public.blob.vercel-storage.com/${pathname}`,
    })),
    del: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("image configuration", () => {
  it("applies the default quality and rejects invalid crop coordinates", () => {
    const parsed = parseImageConfig(imageConfig("couple-portrait"), "couple.image.json");
    expect(parsed.variants.homeHero?.quality).toBe(88);

    expect(() =>
      parseImageConfig(
        imageConfig("couple-portrait", {
          homeHero: {
            width: 800,
            height: 450,
            focalPoint: { x: 1.1, y: 0.5 },
          },
        }),
        "couple.image.json",
      ),
    ).toThrow("focalPoint.x must be a number from 0 through 1");
  });

  it("rejects duplicate asset ids and missing source images", async () => {
    const paths = await createTestPaths();
    await writeConfiguredImage(paths, "first", imageConfig("duplicate"));
    await writeConfiguredImage(paths, "second", imageConfig("duplicate"));

    await expect(prepareImages(paths)).rejects.toThrow('Duplicate image id "duplicate"');

    await rm(path.join(paths.sourceDirectory, "second.jpg"));
    await writeFile(
      path.join(paths.sourceDirectory, "second.image.json"),
      `${JSON.stringify(imageConfig("second"))}\n`,
      "utf8",
    );
    await expect(prepareImages(paths)).rejects.toThrow("Missing source image");
  });
});

describe("image preparation", () => {
  it("calculates a bounded crop around the requested focal point", () => {
    expect(calculateFocalCrop(2000, 1000, 800, 800, { x: 0.9, y: 0.5 })).toEqual({
      resizedWidth: 1600,
      resizedHeight: 800,
      left: 800,
      top: 0,
    });
    expect(() => calculateFocalCrop(400, 300, 800, 450, { x: 0.5, y: 0.5 })).toThrow(
      "would upscale",
    );
  });

  it("creates deterministic WebP variants with stripped metadata", async () => {
    const paths = await createTestPaths();
    await writeConfiguredImage(paths, "couple", imageConfig("couple"));

    const first = await prepareImages(paths);
    const second = await prepareImages(paths);
    const firstVariant = first.variants[0];
    const secondVariant = second.variants[0];

    expect(firstVariant?.contentHash).toBe(secondVariant?.contentHash);
    expect(firstVariant?.localSrc).toMatch(
      /^\/_local-images\/couple\/homeHero-[a-f0-9]{16}\.webp$/,
    );
    const metadata = await sharp(firstVariant?.buffer).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 800, height: 450 });
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
    expect(firstVariant?.blurDataURL).toMatch(/^data:image\/webp;base64,/);
  });
});

describe("Blob synchronization", () => {
  it("uploads only new immutable variants and writes the catalog after success", async () => {
    const paths = await createTestPaths();
    await writeConfiguredImage(
      paths,
      "couple",
      imageConfig("couple", {
        homeHero: { width: 800, height: 450, focalPoint: { x: 0.5, y: 0.5 } },
        storyPortrait: { width: 600, height: 800, focalPoint: { x: 0.5, y: 0.4 } },
      }),
    );
    const prepared = await prepareImages(paths);
    const existing = prepared.variants[0];
    if (!existing) {
      throw new Error("Expected a prepared test variant.");
    }
    const putMock = vi.fn(async (pathname: string) => ({
      pathname,
      url: `https://test.public.blob.vercel-storage.com/${pathname}`,
    }));
    const client = createBlobClient({
      list: vi.fn(async () => ({
        blobs: [
          {
            pathname: existing.pathname,
            url: `https://test.public.blob.vercel-storage.com/${existing.pathname}`,
          },
        ],
        hasMore: false,
      })),
      put: putMock,
    });

    const result = await syncImages(paths, client);

    expect(result.skipped).toEqual([existing.pathname]);
    expect(result.uploaded).toHaveLength(1);
    expect(putMock).toHaveBeenCalledOnce();
    const catalog = JSON.parse(await readFile(paths.catalogFile, "utf8")) as {
      assets: Record<string, { variants: Record<string, { url: string }> }>;
    };
    expect(catalog.assets.couple?.variants.homeHero?.url).toContain(
      ".public.blob.vercel-storage.com/",
    );
  });

  it("does not rewrite the tracked catalog when an upload fails", async () => {
    const paths = await createTestPaths();
    await writeConfiguredImage(paths, "couple", imageConfig("couple"));
    const originalCatalog = await readFile(paths.catalogFile, "utf8");
    const client = createBlobClient({
      put: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
    });

    await expect(syncImages(paths, client)).rejects.toThrow("network unavailable");
    await expect(readFile(paths.catalogFile, "utf8")).resolves.toBe(originalCatalog);
  });

  it("refuses to replace the catalog when no variants are configured", async () => {
    const paths = await createTestPaths();
    const originalCatalog = `${JSON.stringify({
      version: 1,
      assets: { couple: { alt: "A couple", variants: { homeHero: {} } } },
    })}\n`;
    await writeFile(paths.catalogFile, originalCatalog, "utf8");
    const client = createBlobClient();

    await expect(syncImages(paths, client)).rejects.toThrow("no image variants were prepared");
    await expect(readFile(paths.catalogFile, "utf8")).resolves.toBe(originalCatalog);
    expect(client.list).not.toHaveBeenCalled();
  });

  it("paginates remote listings and prunes only after explicit confirmation", async () => {
    const paths = await createTestPaths();
    const referencedPathname = "wedding-images/couple/homeHero-hash.webp";
    await writeFile(
      paths.catalogFile,
      `${JSON.stringify({
        version: 1,
        assets: {
          couple: {
            alt: "A couple",
            variants: {
              homeHero: { pathname: referencedPathname },
            },
          },
        },
      })}\n`,
      "utf8",
    );
    const orphan = {
      pathname: "wedding-images/couple/old-hash.webp",
      url: "https://test.public.blob.vercel-storage.com/wedding-images/couple/old-hash.webp",
    };
    const listMock = vi
      .fn()
      .mockResolvedValueOnce({
        blobs: [
          {
            pathname: referencedPathname,
            url: `https://test.public.blob.vercel-storage.com/${referencedPathname}`,
          },
        ],
        cursor: "next",
        hasMore: true,
      })
      .mockResolvedValue({ blobs: [orphan], hasMore: false });
    const deleteMock = vi.fn(async () => undefined);
    const client = createBlobClient({ list: listMock, del: deleteMock });

    const dryRun = await pruneImages(paths, { client });
    expect(dryRun).toEqual({ orphaned: [orphan], deleted: false });
    expect(deleteMock).not.toHaveBeenCalled();

    listMock.mockClear();
    listMock.mockResolvedValue({ blobs: [orphan], hasMore: false });
    const applied = await pruneImages(paths, { client, apply: true });
    expect(applied.deleted).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith([orphan.url]);
  });
});
