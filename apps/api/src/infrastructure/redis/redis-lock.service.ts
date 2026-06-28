import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(RedisLockService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: 6379,
    });
  }

  /**
   * Acquires a lock for a specific resource.
   * @param resource The unique identifier for the resource to lock (e.g., vehicleId).
   * @param ttl Time-to-live for the lock in milliseconds.
   * @returns Promise<string | null> The lock value if acquired, otherwise null.
   */
  async acquireLock(resource: string, ttl: number = 5000): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockValue = Date.now().toString();
    
    // NX: Only set if key does not exist
    // PX: Set expiry in milliseconds
    const acquired = await this.redis.set(lockKey, lockValue, 'PX', ttl, 'NX');
    
    if (acquired === 'OK') {
      return lockValue;
    }
    
    return null;
  }

  /**
   * Releases a lock only if the provided value matches the current lock value.
   * This prevents a process from accidentally releasing a lock acquired by another process.
   * @param resource The unique identifier for the resource to lock.
   * @param lockValue The value returned by acquireLock.
   */
  async releaseLock(resource: string, lockValue: string): Promise<void> {
    const lockKey = `lock:${resource}`;
    
    // Use a Lua script to ensure atomicity: check value and delete if it matches
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    await this.redis.eval(script, 1, lockKey, lockValue);
  }
}
