import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseConfiguration, type DatabaseEnvironment } from "@/lib/database-config";

type DatabaseClientState = {
  client: PrismaClient;
  databaseUrl: string;
};

const databaseGlobal = globalThis as typeof globalThis & {
  weddingDatabaseClient?: DatabaseClientState;
};

let productionClient: DatabaseClientState | undefined;

export function getDatabaseClient(
  environment: DatabaseEnvironment = process.env,
): PrismaClient | null {
  const configuration = getDatabaseConfiguration(environment);

  if (!configuration) {
    return null;
  }

  const currentState =
    process.env.NODE_ENV === "production" ? productionClient : databaseGlobal.weddingDatabaseClient;

  if (currentState?.databaseUrl === configuration.databaseUrl) {
    return currentState.client;
  }

  const adapter = new PrismaPg({
    connectionString: configuration.databaseUrl,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: 5,
  });
  const state = {
    client: new PrismaClient({ adapter }),
    databaseUrl: configuration.databaseUrl,
  };

  if (process.env.NODE_ENV === "production") {
    productionClient = state;
  } else {
    databaseGlobal.weddingDatabaseClient = state;
  }

  return state.client;
}
