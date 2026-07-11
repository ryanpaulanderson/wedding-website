import type { NextConfig } from "next";
import imageCatalogValue from "./src/generated/image-catalog.json";

type CatalogShape = {
  assets: Record<
    string,
    {
      variants: Record<string, { url: string; quality: number }>;
    }
  >;
};

const imageCatalog = imageCatalogValue as CatalogShape;
const variants = Object.values(imageCatalog.assets).flatMap((asset) =>
  Object.values(asset.variants),
);
const remoteHostnames = [...new Set(variants.map(({ url }) => new URL(url).hostname))];
const qualities = [...new Set([75, ...variants.map(({ quality }) => quality)])].sort(
  (left, right) => left - right,
);

const nextConfig: NextConfig = {
  images: {
    qualities,
    remotePatterns: remoteHostnames.map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/wedding-images/**",
    })),
  },
};

export default nextConfig;
