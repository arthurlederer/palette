import { promises as fs } from "node:fs";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * Stockage des photos. Deux implémentations derrière la même interface :
 * - "local" : disque du serveur (développement, ou hébergement avec volume persistant) ;
 * - "s3" : tout service compatible S3 (Supabase Storage, Cloudflare R2, Scaleway, AWS…).
 * Les fichiers ne sont jamais publics : ils sont servis par /api/photos après contrôle d'accès.
 */
export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const SAFE_KEY = /^[a-zA-Z0-9/_.-]+$/;

function assertSafeKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error(`Clé de stockage invalide : ${key}`);
}

export class LocalStorage implements Storage {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    assertSafeKey(key);
    return path.join(path.resolve(this.root), key);
  }

  async put(key: string, data: Buffer) {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }

  async get(key: string) {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

export class S3Storage implements Storage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async put(key: string, data: Buffer, contentType: string) {
    assertSafeKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }));
  }

  async get(key: string) {
    assertSafeKey(key);
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (e) {
      if ((e as { name?: string }).name === "NoSuchKey") return null;
      throw e;
    }
  }

  async delete(key: string) {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let instance: Storage | null = null;

export function storage(): Storage {
  if (instance) return instance;
  const e = env();
  if (e.STORAGE_DRIVER === "s3") {
    const client = new S3Client({
      region: e.S3_REGION,
      endpoint: e.S3_ENDPOINT,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: e.S3_ACCESS_KEY_ID!, secretAccessKey: e.S3_SECRET_ACCESS_KEY! },
    });
    instance = new S3Storage(client, e.S3_BUCKET!);
  } else {
    instance = new LocalStorage(e.LOCAL_STORAGE_DIR);
  }
  return instance;
}

/** Pour les tests : remplace le stockage courant. */
export function setStorage(s: Storage | null) {
  instance = s;
}
