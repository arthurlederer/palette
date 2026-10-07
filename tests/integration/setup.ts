import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach } from "vitest";

// Variables d'environnement de test, posées avant l'import des modules applicatifs.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/palette_test";
process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-123";
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_STORAGE_DIR = path.join(os.tmpdir(), `palette-test-storage-${process.pid}`);

const { db } = await import("@/lib/db");

beforeEach(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "ElementHistory", "Element", "Client", "User", "Carpenter", "LoginAttempt" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await db.$disconnect();
});
