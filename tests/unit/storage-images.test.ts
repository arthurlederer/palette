import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { LocalStorage, type Storage } from "@/lib/storage";
import { newPhotoKeys, processPhoto } from "@/lib/images";
import { AppError } from "@/lib/errors";

describe("LocalStorage", () => {
  it("écrit, relit et supprime un fichier", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "palette-"));
    const s: Storage = new LocalStorage(dir);
    await s.put("photos/a/b.webp", Buffer.from("hello"), "image/webp");
    expect((await s.get("photos/a/b.webp"))?.toString()).toBe("hello");
    await s.delete("photos/a/b.webp");
    expect(await s.get("photos/a/b.webp")).toBeNull();
  });

  it("refuse les clés qui sortent du dossier (path traversal)", async () => {
    const s: Storage = new LocalStorage(os.tmpdir());
    await expect(s.get("../etc/passwd")).rejects.toThrow();
    await expect(s.put("photos/../../x", Buffer.from(""), "x")).rejects.toThrow();
  });
});

describe("processPhoto", () => {
  it("réduit une grande photo et génère une miniature WebP", async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#884422" } }).jpeg().toBuffer();
    const { full, thumb } = await processPhoto(big);
    const fm = await sharp(full).metadata();
    const tm = await sharp(thumb).metadata();
    expect(fm.format).toBe("webp");
    expect(Math.max(fm.width!, fm.height!)).toBe(1600);
    expect(tm.width).toBe(480);
    expect(full.length).toBeLessThan(big.length);
  });

  it("refuse un fichier qui n'est pas une image", async () => {
    await expect(processPhoto(Buffer.from("%PDF-1.4 pas une image"))).rejects.toBeInstanceOf(AppError);
  });

  it("génère des clés uniques rangées par menuisier", () => {
    const a = newPhotoKeys("c1");
    const b = newPhotoKeys("c1");
    expect(a.photoKey).toMatch(/^photos\/c1\/[0-9a-f-]+\.webp$/);
    expect(a.thumbKey).toMatch(/^thumbs\/c1\//);
    expect(a.photoKey).not.toBe(b.photoKey);
  });
});
