/**
 * VANGUARD — Redis-backed Sliding Window Event Store & Pub/Sub Broadcaster.
 *
 * Extends the high-speed EventStore ring buffer with:
 *   1. Redis HSET event hash storage
 *   2. Redis ZSET timestamp timeline indexing
 *   3. Redis Pub/Sub real-time channel broadcasting
 *   4. Zero-downtime fallback to local memory if Redis is offline
 */

import type { Redis } from 'ioredis';
import { EventStore } from './EventStore.js';
import type { UnifiedEvent } from '../types/events.js';
import { toEpochMs } from '../util/time.js';
import { isRedisConnected } from '../config/redis.js';

export const REDIS_EVENTS_HASH = 'vanguard:events:hash';
export const REDIS_EVENTS_TIMELINE = 'vanguard:events:timeline';
export const REDIS_EVENTS_PUBSUB = 'vanguard:events:pubsub';

export class RedisEventStore extends EventStore {
  private readonly redis: Redis | null;

  constructor(redisClient: Redis | null, capacity?: number) {
    super(capacity);
    this.redis = redisClient;
  }

  /** Insert or replace events in local memory AND Redis if available. */
  override upsert(events: UnifiedEvent[]): void {
    // 1. Perform L1 in-memory upsert for instant access
    super.upsert(events);

    // 2. Synchronize to Redis if active
    if (this.redis && isRedisConnected() && events.length > 0) {
      this.syncToRedis(events).catch((err) => {
        console.warn('[RedisEventStore] Async Redis sync error:', err.message);
      });
    }
  }

  /** Async background push to Redis Hash, Sorted Set, and Pub/Sub channel */
  private async syncToRedis(events: UnifiedEvent[]): Promise<void> {
    if (!this.redis) return;

    const pipeline = this.redis.pipeline();

    for (const event of events) {
      const payload = JSON.stringify(event);
      const epochMs = toEpochMs(event.timestamp);

      // Store full JSON event payload in Hash
      pipeline.hset(REDIS_EVENTS_HASH, event.id, payload);

      // Store in timeline Sorted Set scored by timestamp for O(log N) range queries
      pipeline.zadd(REDIS_EVENTS_TIMELINE, epochMs, event.id);

      // Publish event notification to Redis Pub/Sub stream
      pipeline.publish(REDIS_EVENTS_PUBSUB, payload);
    }

    // Trim older events outside the 2-hour window (7200000ms ago)
    const twoHoursAgo = Date.now() - 7200000;
    pipeline.zremrangebyscore(REDIS_EVENTS_TIMELINE, '-inf', twoHoursAgo);

    await pipeline.exec();
  }

  /** Subscribe to real-time events published across Redis instances */
  subscribeToRedisStream(onEvent: (event: UnifiedEvent) => void): void {
    if (!this.redis) return;

    try {
      const subClient = this.redis.duplicate();
      subClient.subscribe(REDIS_EVENTS_PUBSUB, (err) => {
        if (err) console.warn('[Redis] PubSub subscribe failed:', err.message);
      });

      subClient.on('message', (channel, message) => {
        if (channel === REDIS_EVENTS_PUBSUB) {
          try {
            const parsedEvent: UnifiedEvent = JSON.parse(message);
            onEvent(parsedEvent);
          } catch (e) {
            // Ignore parse errors
          }
        }
      });
    } catch (err: any) {
      console.warn('[Redis] Unable to setup PubSub subscriber:', err.message);
    }
  }
}
