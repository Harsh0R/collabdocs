import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const lockRedis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

const LOCK_TTL_MS = 30_000;
const RENEW_INTERVAL_MS = 10_000;
const LOCK_PREFIX = "collabdocs:restore-lock:";

export interface DocumentLock {
  documentId: string;
  token: string;
  key: string;
}

const RENEW_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
  end

  return 0
`;

const RELEASE_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end

  return 0
`;

export async function acquireDocumentLock(
  documentId: string,
): Promise<DocumentLock | null> {
  const key = `${LOCK_PREFIX}${documentId}`;
  const token = randomUUID();

  const result = await lockRedis.set(key, token, "PX", LOCK_TTL_MS, "NX");

  if (result !== "OK") {
    return null;
  }

  return { documentId, token, key };
}

export async function renewDocumentLock(lock: DocumentLock): Promise<boolean> {
  const result = await lockRedis.eval(
    RENEW_LOCK_SCRIPT,
    1,
    lock.key,
    lock.token,
    String(LOCK_TTL_MS),
  );

  return result === 1;
}

export async function releaseDocumentLock(
  lock: DocumentLock,
): Promise<boolean> {
  const result = await lockRedis.eval(
    RELEASE_LOCK_SCRIPT,
    1,
    lock.key,
    lock.token,
  );

  return result === 1;
}

export async function assertDocumentLockOwnership(
  lock: DocumentLock,
): Promise<void> {
  const currentToken = await lockRedis.get(lock.key);

  if (currentToken !== lock.token) {
    throw new Error(
      `Restore lock lost for document ${lock.documentId}. Operation aborted.`,
    );
  }
}

export async function withDocumentLock<T>(
  documentId: string,
  operation: (lock: DocumentLock) => Promise<T>,
): Promise<T> {
  const lock = await acquireDocumentLock(documentId);

  if (!lock) {
    throw new Error(
      "This document is currently being restored by another user. Please try again.",
    );
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  let rejectLockLost!: (error: Error) => void;

  const lockLost = new Promise<never>((_, reject) => {
    rejectLockLost = reject;
  });

  // Prevent an unhandled rejection if the operation finishes first.
  void lockLost.catch(() => undefined);

  const heartbeat = async (): Promise<void> => {
    if (stopped) return;

    try {
      const renewed = await renewDocumentLock(lock);

      if (!renewed) {
        throw new Error("Restore lock lease was lost.");
      }

      if (!stopped) {
        timer = setTimeout(() => {
          void heartbeat();
        }, RENEW_INTERVAL_MS);
      }
    } catch (error) {
      const reason =
        error instanceof Error
          ? error
          : new Error("Unable to renew restore lock.");

      rejectLockLost(reason);
    }
  };

  try {
    timer = setTimeout(() => {
      void heartbeat();
    }, RENEW_INTERVAL_MS);

    const operationPromise = operation(lock);

    return await Promise.race([operationPromise, lockLost]);
  } finally {
    stopped = true;

    if (timer) {
      clearTimeout(timer);
    }

    try {
      await releaseDocumentLock(lock);
    } catch (error) {
      console.error(
        `[LOCK] Failed to release restore lock for ${documentId}`,
        error,
      );
    }
  }
}
