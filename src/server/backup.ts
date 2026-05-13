import { copyFile, mkdir, readdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

const KEEP = 10;

export async function backup(dbPath: string): Promise<string> {
  const dir = join(dirname(dbPath), "backups");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(dir, `db-${stamp}.json`);
  await copyFile(dbPath, target);
  await rotate(dir);
  return target;
}

async function rotate(dir: string) {
  const files = (await readdir(dir)).filter(f => f.startsWith("db-")).sort();
  while (files.length > KEEP) {
    const old = files.shift()!;
    await unlink(join(dir, old));
  }
}
