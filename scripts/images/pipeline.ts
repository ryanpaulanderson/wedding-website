import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import sharp from "sharp";

export const DEFAULT_IMAGE_QUALITY = 88;
export const IMAGE_BLOB_PREFIX = "wedding-images/";

const ALLOWED_SOURCE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
const ASSET_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VARIANT_ID_PATTERN = /^[a-z][A-Za-z0-9]*$/;

export type FocalPoint = {
  x: number;
  y: number;
};

export type ImageVariantConfig = {
  width: number;
  height: number;
  quality: number;
  focalPoint: FocalPoint;
};

export type ImageConfig = {
  id: string;
  alt: string;
  variants: Record<string, ImageVariantConfig>;
};

export type PreparedVariant = ImageVariantConfig & {
  assetId: string;
  alt: string;
  variantId: string;
  contentHash: string;
  pathname: string;
  localSrc: string;
  blurDataURL: string;
  buffer: Buffer;
};

export type PreparedImages = {
  variants: PreparedVariant[];
  skippedConfigs: string[];
  configuredAssetIds: string[];
  skippedAssetIds: string[];
};

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

export type PipelinePaths = {
  sourceDirectory: string;
  previewDirectory: string;
  cacheDirectory: string;
  catalogFile: string;
};

type BlobEntry = {
  pathname: string;
  url: string;
};

type BlobListResult = {
  blobs: BlobEntry[];
  cursor?: string;
  hasMore: boolean;
};

export type BlobClient = {
  list: (options: { prefix: string; limit: number; cursor?: string }) => Promise<BlobListResult>;
  put: (
    pathname: string,
    body: Buffer,
    options: {
      access: "public";
      addRandomSuffix: false;
      cacheControlMaxAge: number;
    },
  ) => Promise<BlobEntry>;
  del: (urls: string[]) => Promise<void>;
};

const defaultBlobClient: BlobClient = {
  async list(options) {
    return list(options);
  },
  async put(pathname, body, options) {
    return put(pathname, body, options);
  },
  async del(urls) {
    await del(urls);
  },
};

export function getDefaultPipelinePaths(rootDirectory = process.cwd()): PipelinePaths {
  return {
    sourceDirectory: path.join(rootDirectory, "local-images"),
    previewDirectory: path.join(rootDirectory, "public", "_local-images"),
    cacheDirectory: path.join(rootDirectory, ".image-cache"),
    catalogFile: path.join(rootDirectory, "src", "generated", "image-catalog.json"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: string[],
  context: string,
): void {
  const unexpectedKeys = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    throw new Error(`${context} contains unsupported field(s): ${unexpectedKeys.join(", ")}.`);
  }
}

function parseInteger(
  value: unknown,
  field: string,
  context: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(`${context}.${field} must be an integer from ${minimum} through ${maximum}.`);
  }

  return Number(value);
}

function parseCoordinate(value: unknown, field: string, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${context}.${field} must be a number from 0 through 1.`);
  }

  return value;
}

export function parseImageConfig(value: unknown, configPath: string): ImageConfig {
  const context = `Image config ${configPath}`;
  if (!isRecord(value)) {
    throw new Error(`${context} must contain a JSON object.`);
  }

  assertOnlyKeys(value, ["$schema", "id", "alt", "variants"], context);

  if (typeof value.$schema !== "string" || value.$schema.length === 0) {
    throw new Error(`${context}.$schema must be a non-empty string.`);
  }
  if (typeof value.id !== "string" || !ASSET_ID_PATTERN.test(value.id)) {
    throw new Error(`${context}.id must be a unique kebab-case identifier.`);
  }
  if (typeof value.alt !== "string") {
    throw new Error(`${context}.alt must be a string; use an empty string for decorative images.`);
  }
  if (!isRecord(value.variants) || Object.keys(value.variants).length === 0) {
    throw new Error(`${context}.variants must define at least one named variant.`);
  }

  const variants: Record<string, ImageVariantConfig> = {};
  for (const [variantId, rawVariant] of Object.entries(value.variants)) {
    const variantContext = `${context}.variants.${variantId}`;
    if (!VARIANT_ID_PATTERN.test(variantId)) {
      throw new Error(`${variantContext} must use a camelCase identifier.`);
    }
    if (!isRecord(rawVariant)) {
      throw new Error(`${variantContext} must contain a JSON object.`);
    }

    assertOnlyKeys(rawVariant, ["width", "height", "quality", "focalPoint"], variantContext);
    if (!isRecord(rawVariant.focalPoint)) {
      throw new Error(`${variantContext}.focalPoint must contain x and y coordinates.`);
    }
    assertOnlyKeys(rawVariant.focalPoint, ["x", "y"], `${variantContext}.focalPoint`);

    variants[variantId] = {
      width: parseInteger(rawVariant.width, "width", variantContext, 1, 8192),
      height: parseInteger(rawVariant.height, "height", variantContext, 1, 8192),
      quality:
        rawVariant.quality === undefined
          ? DEFAULT_IMAGE_QUALITY
          : parseInteger(rawVariant.quality, "quality", variantContext, 1, 100),
      focalPoint: {
        x: parseCoordinate(rawVariant.focalPoint.x, "x", `${variantContext}.focalPoint`),
        y: parseCoordinate(rawVariant.focalPoint.y, "y", `${variantContext}.focalPoint`),
      },
    };
  }

  return { id: value.id, alt: value.alt, variants };
}

async function collectConfigFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectConfigFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith(".image.json") ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat().sort((left, right) => left.localeCompare(right));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function findSourceFile(configPath: string): Promise<string | undefined> {
  const sourceBase = configPath.slice(0, -".image.json".length);
  const candidates = await Promise.all(
    ALLOWED_SOURCE_EXTENSIONS.map(async (extension) => {
      const candidate = `${sourceBase}${extension}`;
      try {
        return (await stat(candidate)).isFile() ? candidate : undefined;
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return undefined;
        }
        throw error;
      }
    }),
  );
  const matches = candidates.filter((candidate): candidate is string => candidate !== undefined);

  if (matches.length > 1) {
    throw new Error(
      `Image config ${configPath} has multiple source files (${matches.join(", ")}); keep exactly one.`,
    );
  }

  return matches[0];
}

async function loadImageDefinitions(
  paths: PipelinePaths,
  allowMissingSources: boolean,
): Promise<{
  definitions: Array<{
    configPath: string;
    sourcePath: string;
    config: ImageConfig;
  }>;
  configuredAssetIds: string[];
  skipped: Array<{ configPath: string; assetId: string }>;
}> {
  const configPaths = await collectConfigFiles(paths.sourceDirectory);
  const configs = await Promise.all(
    configPaths.map(async (configPath) => {
      let rawConfig: unknown;
      try {
        rawConfig = JSON.parse(await readFile(configPath, "utf8"));
      } catch (error) {
        throw new Error(
          `Could not parse image config ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
      return { configPath, config: parseImageConfig(rawConfig, configPath) };
    }),
  );

  const configPathsById = new Map<string, string>();
  for (const { configPath, config } of configs) {
    const existingPath = configPathsById.get(config.id);
    if (existingPath) {
      throw new Error(`Duplicate image id "${config.id}" in ${existingPath} and ${configPath}.`);
    }
    configPathsById.set(config.id, configPath);
  }

  const definitions = await Promise.all(
    configs.map(async ({ configPath, config }) => ({
      configPath,
      config,
      sourcePath: await findSourceFile(configPath),
    })),
  );

  const missingSources = definitions.filter(({ sourcePath }) => sourcePath === undefined);
  if (!allowMissingSources && missingSources.length > 0) {
    throw new Error(
      `Missing source image for ${missingSources.map(({ configPath }) => configPath).join(", ")}. ` +
        `Add one adjacent ${ALLOWED_SOURCE_EXTENSIONS.join(", ")} file with the same base name.`,
    );
  }

  return {
    definitions: definitions
      .filter(
        (definition): definition is typeof definition & { sourcePath: string } =>
          definition.sourcePath !== undefined,
      )
      .sort((left, right) => left.config.id.localeCompare(right.config.id)),
    configuredAssetIds: configs.map(({ config }) => config.id).sort(),
    skipped: missingSources
      .map(({ configPath, config }) => ({ configPath, assetId: config.id }))
      .sort((left, right) => left.assetId.localeCompare(right.assetId)),
  };
}

export function calculateFocalCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  focalPoint: FocalPoint,
): { resizedWidth: number; resizedHeight: number; left: number; top: number } {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  if (scale > 1) {
    throw new Error(
      `Target ${targetWidth}x${targetHeight} would upscale source ${sourceWidth}x${sourceHeight}.`,
    );
  }

  const resizedWidth = Math.max(targetWidth, Math.round(sourceWidth * scale));
  const resizedHeight = Math.max(targetHeight, Math.round(sourceHeight * scale));
  const maximumLeft = resizedWidth - targetWidth;
  const maximumTop = resizedHeight - targetHeight;
  const left = Math.min(
    maximumLeft,
    Math.max(0, Math.round(focalPoint.x * resizedWidth - targetWidth / 2)),
  );
  const top = Math.min(
    maximumTop,
    Math.max(0, Math.round(focalPoint.y * resizedHeight - targetHeight / 2)),
  );

  return { resizedWidth, resizedHeight, left, top };
}

async function prepareVariant(
  sourcePath: string,
  config: ImageConfig,
  variantId: string,
  variant: ImageVariantConfig,
  paths: PipelinePaths,
): Promise<PreparedVariant> {
  const normalizedSource = await sharp(sourcePath).rotate().toBuffer();
  const metadata = await sharp(normalizedSource).metadata();
  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error(`Could not read image dimensions or format from ${sourcePath}.`);
  }
  if (!ALLOWED_SOURCE_EXTENSIONS.includes(`.${metadata.format}`.replace(".jpeg", ".jpg"))) {
    throw new Error(
      `${sourcePath} uses unsupported ${metadata.format} content; use JPEG, PNG, WebP, or AVIF.`,
    );
  }

  let crop;
  try {
    crop = calculateFocalCrop(
      metadata.width,
      metadata.height,
      variant.width,
      variant.height,
      variant.focalPoint,
    );
  } catch (error) {
    throw new Error(
      `${config.id}.${variantId}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  const buffer = await sharp(normalizedSource)
    .resize(crop.resizedWidth, crop.resizedHeight, { fit: "fill" })
    .extract({ left: crop.left, top: crop.top, width: variant.width, height: variant.height })
    .webp({ quality: variant.quality })
    .toBuffer();
  const contentHash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const fileName = `${variantId}-${contentHash}.webp`;
  const localDirectory = path.join(paths.previewDirectory, config.id);
  const localFile = path.join(localDirectory, fileName);
  await mkdir(localDirectory, { recursive: true });
  await writeFile(localFile, buffer);

  const blurBuffer = await sharp(buffer)
    .resize({ width: Math.min(24, variant.width), withoutEnlargement: true })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    ...variant,
    assetId: config.id,
    alt: config.alt,
    variantId,
    contentHash,
    pathname: `${IMAGE_BLOB_PREFIX}${config.id}/${fileName}`,
    localSrc: `/_local-images/${config.id}/${fileName}`,
    blurDataURL: `data:image/webp;base64,${blurBuffer.toString("base64")}`,
    buffer,
  };
}

export async function prepareImages(
  paths = getDefaultPipelinePaths(),
  options: { allowMissingSources?: boolean } = {},
): Promise<PreparedImages> {
  const allowMissingSources = options.allowMissingSources ?? false;
  const { definitions, configuredAssetIds, skipped } = await loadImageDefinitions(
    paths,
    allowMissingSources,
  );

  await rm(paths.previewDirectory, { recursive: true, force: true });
  await mkdir(paths.previewDirectory, { recursive: true });
  await mkdir(paths.cacheDirectory, { recursive: true });

  const variantGroups = await Promise.all(
    definitions.map(({ sourcePath, config }) =>
      Promise.all(
        Object.entries(config.variants)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([variantId, variant]) =>
            prepareVariant(sourcePath, config, variantId, variant, paths),
          ),
      ),
    ),
  );
  const variants = variantGroups.flat();
  const skippedConfigs = skipped.map(({ configPath }) => configPath);
  const skippedAssetIds = skipped.map(({ assetId }) => assetId);

  await writeFile(
    path.join(paths.cacheDirectory, "prepared-images.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        variants: variants.map((variant) => ({ ...variant, buffer: undefined })),
        skippedConfigs,
        configuredAssetIds,
        skippedAssetIds,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return { variants, skippedConfigs, configuredAssetIds, skippedAssetIds };
}

async function listAllBlobs(client: BlobClient): Promise<BlobEntry[]> {
  const blobs: BlobEntry[] = [];
  let cursor: string | undefined;

  do {
    const result = await client.list({ prefix: IMAGE_BLOB_PREFIX, limit: 1000, cursor });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  return blobs;
}

function buildCatalog(
  preparedVariants: PreparedVariant[],
  remoteEntries: Map<string, BlobEntry>,
): ImageCatalog {
  const catalog: ImageCatalog = { version: 1, assets: {} };

  for (const prepared of preparedVariants) {
    const remote = remoteEntries.get(prepared.pathname);
    if (!remote) {
      throw new Error(`Upload completed without a Blob URL for ${prepared.pathname}.`);
    }

    const asset = (catalog.assets[prepared.assetId] ??= {
      alt: prepared.alt,
      variants: {},
    });
    asset.variants[prepared.variantId] = {
      url: remote.url,
      pathname: prepared.pathname,
      localSrc: prepared.localSrc,
      width: prepared.width,
      height: prepared.height,
      quality: prepared.quality,
      blurDataURL: prepared.blurDataURL,
      contentHash: prepared.contentHash,
    };
  }

  return catalog;
}

function normalizeError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

async function uploadVariants(
  variants: PreparedVariant[],
  client: BlobClient,
): Promise<BlobEntry[]> {
  const results = await Promise.allSettled(
    variants.map((variant) =>
      client.put(variant.pathname, variant.buffer, {
        access: "public",
        addRandomSuffix: false,
        cacheControlMaxAge: 31_536_000,
      }),
    ),
  );
  const uploadedEntries = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const uploadErrors = results.flatMap((result) =>
    result.status === "rejected" ? [normalizeError(result.reason)] : [],
  );

  if (uploadErrors.length === 0) {
    return uploadedEntries;
  }

  if (uploadedEntries.length > 0) {
    try {
      await client.del(uploadedEntries.map(({ url }) => url));
    } catch (rollbackError) {
      throw new AggregateError(
        [...uploadErrors, normalizeError(rollbackError)],
        `Image sync failed and rollback of ${uploadedEntries.length} uploaded variant(s) also failed.`,
      );
    }
  }

  if (uploadErrors.length === 1) {
    throw uploadErrors[0];
  }
  throw new AggregateError(uploadErrors, `Image sync failed for ${uploadErrors.length} variants.`);
}

export async function syncImages(
  paths = getDefaultPipelinePaths(),
  client: BlobClient = defaultBlobClient,
): Promise<{ catalog: ImageCatalog; uploaded: string[]; skipped: string[] }> {
  const prepared = await prepareImages(paths);
  if (prepared.variants.length === 0) {
    throw new Error(
      "Image sync refused because no image variants were prepared; the existing catalog was not changed.",
    );
  }
  const existingBlobs = await listAllBlobs(client);
  const remoteEntries = new Map(existingBlobs.map((blob) => [blob.pathname, blob]));
  const toUpload = prepared.variants.filter((variant) => !remoteEntries.has(variant.pathname));

  const uploadedEntries = await uploadVariants(toUpload, client);
  for (const entry of uploadedEntries) {
    remoteEntries.set(entry.pathname, entry);
  }

  const catalog = buildCatalog(prepared.variants, remoteEntries);
  await mkdir(path.dirname(paths.catalogFile), { recursive: true });
  await writeFile(paths.catalogFile, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  return {
    catalog,
    uploaded: uploadedEntries.map(({ pathname }) => pathname),
    skipped: prepared.variants
      .filter((variant) => !toUpload.includes(variant))
      .map(({ pathname }) => pathname),
  };
}

export async function pruneImages(
  paths = getDefaultPipelinePaths(),
  options: { apply?: boolean; client?: BlobClient } = {},
): Promise<{ orphaned: BlobEntry[]; deleted: boolean }> {
  const client = options.client ?? defaultBlobClient;
  const catalogValue: unknown = JSON.parse(await readFile(paths.catalogFile, "utf8"));
  if (!isRecord(catalogValue) || !isRecord(catalogValue.assets)) {
    throw new Error(`Generated image catalog ${paths.catalogFile} is invalid.`);
  }

  const referencedPathnames = new Set<string>();
  for (const asset of Object.values(catalogValue.assets)) {
    if (!isRecord(asset) || !isRecord(asset.variants)) {
      throw new Error(`Generated image catalog ${paths.catalogFile} is invalid.`);
    }
    for (const variant of Object.values(asset.variants)) {
      if (!isRecord(variant) || typeof variant.pathname !== "string") {
        throw new Error(`Generated image catalog ${paths.catalogFile} is invalid.`);
      }
      referencedPathnames.add(variant.pathname);
    }
  }

  const remoteBlobs = await listAllBlobs(client);
  const orphaned = remoteBlobs.filter((blob) => !referencedPathnames.has(blob.pathname));
  if (options.apply && orphaned.length > 0) {
    await client.del(orphaned.map(({ url }) => url));
  }

  return { orphaned, deleted: Boolean(options.apply && orphaned.length > 0) };
}
