import Redis from "ioredis";

let client: Redis | null = null;

function buildRedisConfig(): Redis | null {
  // Prefer a full URL (used by Render / Railway auto-inject)
  const url = process.env["REDIS_URL"];
  if (url) return new Redis(url, { maxRetriesPerRequest: 1, enableReadyCheck: false });

  // Fall back to individual parts (Redis Cloud / custom setup)
  const host = process.env["REDIS_HOST"];
  const port = Number(process.env["REDIS_PORT"] ?? 6379);
  const password = process.env["REDIS_PASSWORD"];
  const username = process.env["REDIS_USER"] ?? "default";

  if (!host) return null; // Redis not configured

  return new Redis({
    host,
    port,
    username,
    password,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    tls: process.env["REDIS_TLS"] === "true" ? {} : undefined,
  });
}

/**
 * Returns the singleton Redis client, or null if Redis is not configured.
 * Connection is lazy — established on first call.
 */
export function getRedisClient(): Redis | null {
  if (client) return client;
  client = buildRedisConfig();
  if (!client) return null;

  client.on("connect", () => console.log("Redis connected ✓"));
  client.on("error", (err: Error) => console.error("[Redis]", err.message));
  return client;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    console.log("Redis not configured — caching disabled");
    return;
  }
  await redis.ping();
}
