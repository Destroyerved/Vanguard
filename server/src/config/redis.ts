/**
 * VANGUARD — Redis client configuration & health management.
 *
 * Provides a resilient Redis client instance with connection status tracking
 * and automatic fallback handling for offline environments.
 */

import { Redis } from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_URL = process.env.REDIS_URL;

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  try {
    const client = REDIS_URL
      ? new Redis(REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
      : new Redis({
          host: REDIS_HOST,
          port: REDIS_PORT,
          password: REDIS_PASSWORD,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy(times) {
            if (times > 3) return null; // Stop retrying after 3 attempts
            return Math.min(times * 100, 1000);
          }
        });

    client.on('connect', () => {
      isRedisAvailable = true;
      console.log(`[Redis] Connected to Redis server at ${REDIS_HOST}:${REDIS_PORT}`);
    });

    client.on('error', (err) => {
      if (isRedisAvailable) {
        console.warn('[Redis] Connection lost. Falling back to in-memory store:', err.message);
      }
      isRedisAvailable = false;
    });

    redisClient = client;
    return redisClient;
  } catch (e) {
    console.warn('[Redis] Initial connection failed. Operating in in-memory fallback mode.');
    isRedisAvailable = false;
    return null;
  }
}

export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient?.status === 'ready';
}
