import { getRedisClient } from "./redis";

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (e) {
    console.error("[cache] setCache failed:", e);
  }
}

export async function deleteCache(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (e) {
    console.error("[cache] deleteCache failed:", e);
  }
}

/**
 * Deletes every key whose name starts with `prefix`.
 * Uses KEYS — fine for low volume. For high traffic consider SCAN instead.
 */
export async function deleteCacheByPrefix(prefix: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) await redis.del(...keys);
  } catch (e) {
    console.error("[cache] deleteCacheByPrefix failed:", e);
  }
}
