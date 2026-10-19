import { randomUUID } from 'crypto';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IProject } from '../models/Project.js';
import type { ITask } from '../models/Task.js';

interface StoreData {
  projects: IProject[];
  tasks: ITask[];
}

const backendDirectory = fileURLToPath(new URL('../../', import.meta.url));
export const dataDirectory = path.resolve(process.env.PM_AI_DATA_DIR || path.join(backendDirectory, 'data'));
export const dataFile = path.join(dataDirectory, 'store.json');
export const uploadsDirectory = process.env.PM_AI_DATA_DIR
  ? path.join(dataDirectory, 'uploads')
  : path.join(backendDirectory, 'uploads');

let writeQueue: Promise<void> = Promise.resolve();

const emptyStore = (): StoreData => ({ projects: [], tasks: [] });

const loadStore = async (): Promise<StoreData> => {
  await mkdir(dataDirectory, { recursive: true });
  try {
    const parsed: unknown = JSON.parse(await readFile(dataFile, 'utf8'));
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as StoreData).projects) ||
      !Array.isArray((parsed as StoreData).tasks)
    ) {
      throw new Error(`Local data file has an invalid format: ${dataFile}`);
    }
    return parsed as StoreData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return emptyStore();
  }
};

const saveStore = async (store: StoreData): Promise<void> => {
  await mkdir(dataDirectory, { recursive: true });
  const tempFile = path.join(dataDirectory, `store.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(tempFile, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    await rename(tempFile, dataFile);
  } catch (error) {
    await unlink(tempFile).catch(() => undefined);
    throw error;
  }
};

const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = writeQueue.then(operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
};

export const readStore = (): Promise<StoreData> =>
  serialize(async () => structuredClone(await loadStore()));

export const updateStore = <T>(update: (store: StoreData) => T | Promise<T>): Promise<T> =>
  serialize(async () => {
    const store = await loadStore();
    const result = await update(store);
    await saveStore(store);
    return structuredClone(result);
  });

export const createId = (): string => randomUUID();

export const persistUploadedFile = async (content: Buffer, extension: string): Promise<string> => {
  await mkdir(uploadsDirectory, { recursive: true });
  const storageName = `${randomUUID()}${extension}`;
  await writeFile(path.join(uploadsDirectory, storageName), content, { flag: 'wx' });
  return storageName;
};

export const removeUploadedFile = async (storageName?: string): Promise<void> => {
  if (!storageName || path.basename(storageName) !== storageName) return;
  await unlink(path.join(uploadsDirectory, storageName)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
};

export const initializeStorage = async (): Promise<void> => {
  await mkdir(dataDirectory, { recursive: true });
  await mkdir(uploadsDirectory, { recursive: true });
  await serialize(async () => {
    let exists = true;
    try {
      await readFile(dataFile, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      exists = false;
    }
    if (!exists) {
      await saveStore(emptyStore());
    } else {
      await loadStore();
    }
  });
  console.log(`Local JSON storage ready: ${dataFile}`);
};

export const uploadedFileExists = async (storageName: string): Promise<boolean> => {
  if (!storageName || path.basename(storageName) !== storageName) return false;
  try {
    await access(path.join(uploadsDirectory, storageName));
    return true;
  } catch {
    return false;
  }
};