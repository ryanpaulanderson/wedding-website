import process from "node:process";
import { config as loadEnvironment } from "dotenv";
import { getDefaultPipelinePaths, prepareImages, pruneImages, syncImages } from "./pipeline";

loadEnvironment({ path: [".env.local", ".env"], quiet: true });

async function main(): Promise<void> {
  const [, , command, ...arguments_] = process.argv;
  const paths = getDefaultPipelinePaths();

  if (command === "prepare") {
    const prepared = await prepareImages(paths, {
      allowMissingSources: arguments_.includes("--allow-missing-sources"),
    });
    console.log(
      `Prepared ${prepared.variants.length} image variant(s)` +
        (prepared.skippedConfigs.length > 0
          ? `; ${prepared.skippedConfigs.length} config(s) used remote fallbacks.`
          : "."),
    );
    return;
  }

  if (command === "sync") {
    requireBlobToken();
    const result = await syncImages(paths);
    console.log(
      `Image sync complete: uploaded ${result.uploaded.length}, skipped ${result.skipped.length}.`,
    );
    return;
  }

  if (command === "prune") {
    requireBlobToken();
    const apply = arguments_.includes("--apply");
    const result = await pruneImages(paths, { apply });
    if (result.orphaned.length === 0) {
      console.log("No orphaned image blobs found.");
      return;
    }

    for (const orphan of result.orphaned) {
      console.log(`${apply ? "Deleted" : "Would delete"}: ${orphan.pathname}`);
    }
    if (!apply) {
      console.log("Dry run only. Re-run with --apply to delete these immutable blobs.");
    }
    return;
  }

  throw new Error("Usage: images <prepare|sync|prune> [--allow-missing-sources|--apply]");
}

function requireBlobToken(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is missing. Create/connect a public Vercel Blob store, then run `vercel env pull .env.local --yes`.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
