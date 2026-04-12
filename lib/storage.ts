/**
 * Storage abstraction for user profile markdown files.
 *
 * Production: Cloudflare R2 (S3-compatible)
 * Development: Local filesystem (~/.photoscout/users/)
 *
 * All operations work with raw strings (markdown files).
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import path from "path";

// ─── Config ───

const IS_R2 = !!(
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_ENDPOINT
);

const R2_BUCKET = process.env.R2_BUCKET || "photoscout-profiles";

const LOCAL_BASE = path.join(
  process.env.HOME || "~",
  ".photoscout"
);

// ─── R2 Client (lazy init) ───

let _r2: S3Client | null = null;

function getR2(): S3Client {
  if (!_r2) {
    _r2 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2;
}

// ─── Public API ───

/**
 * Read a file from storage.
 * Key format: "users/{userId}/profile.md"
 */
export async function storageRead(key: string): Promise<string | null> {
  if (IS_R2) {
    try {
      const res = await getR2().send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
      );
      return (await res.Body?.transformToString("utf-8")) ?? null;
    } catch (e: unknown) {
      if ((e as { name?: string }).name === "NoSuchKey") return null;
      throw e;
    }
  }

  // Local filesystem fallback
  const filePath = path.join(LOCAL_BASE, key);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Write a file to storage.
 */
export async function storageWrite(
  key: string,
  content: string
): Promise<void> {
  if (IS_R2) {
    await getR2().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: content,
        ContentType: "text/markdown; charset=utf-8",
      })
    );
    return;
  }

  // Local filesystem fallback
  const filePath = path.join(LOCAL_BASE, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Check if a file exists in storage.
 */
export async function storageExists(key: string): Promise<boolean> {
  if (IS_R2) {
    try {
      await getR2().send(
        new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })
      );
      return true;
    } catch {
      return false;
    }
  }

  const filePath = path.join(LOCAL_BASE, key);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all user profile keys.
 * Returns keys like "users/{userId}/profile.md"
 */
export async function storageListProfiles(): Promise<string[]> {
  if (IS_R2) {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const res = await getR2().send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          Prefix: "users/",
          ContinuationToken: continuationToken,
        })
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key?.endsWith("/profile.md")) {
          keys.push(obj.Key);
        }
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }

  // Local filesystem: walk users/ directory
  const keys: string[] = [];
  try {
    const userDirs = await fs.readdir(LOCAL_BASE);
    for (const dir of userDirs) {
      const profilePath = path.join(LOCAL_BASE, dir, "profile.md");
      try {
        await fs.access(profilePath);
        keys.push(`${dir}/profile.md`);
      } catch {
        // no profile.md in this dir
      }
    }
  } catch {
    // users dir doesn't exist yet
  }
  return keys;
}

/**
 * Get the storage key for a user's profile.
 */
export function profileKey(userId: string): string {
  return `users/${userId}/profile.md`;
}

/**
 * Report which backend is active (for debugging).
 */
export function storageBackend(): "r2" | "local" {
  return IS_R2 ? "r2" : "local";
}
