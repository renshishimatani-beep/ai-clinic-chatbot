const DB_NAME = "tsunamaru_sales_demo_assets";
const DB_VERSION = 1;
const STORE_NAME = "prospect_screenshots";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_WIDTH = 1920;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type StoredProspectScreenshot = {
  key: string;
  dealId: string;
  blob: Blob;
  originalName: string;
  mimeType: string;
  size: number;
  updatedAt: string;
};

export function prospectScreenshotKey(dealId: string): string {
  return `prospect-screenshot:${dealId}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("画像保存領域を開けませんでした。"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("画像データを処理できませんでした。"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("画像データを保存できませんでした。"));
  });
}

export async function getProspectScreenshot(storageKey: string): Promise<StoredProspectScreenshot | null> {
  if (!storageKey) return null;
  return (await withStore<StoredProspectScreenshot | undefined>("readonly", (store) => store.get(storageKey))) ?? null;
}

export async function saveProspectScreenshot(dealId: string, file: File): Promise<StoredProspectScreenshot> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("PNG・JPEG・WebP画像を選択してください。");
  if (file.size > MAX_FILE_SIZE) throw new Error("画像は10MB以下にしてください。");
  const blob = await optimizeScreenshot(file);
  const record: StoredProspectScreenshot = {
    key: prospectScreenshotKey(dealId),
    dealId,
    blob,
    originalName: file.name,
    mimeType: blob.type || file.type,
    size: blob.size,
    updatedAt: new Date().toISOString(),
  };
  await withStore("readwrite", (store) => store.put(record));
  return record;
}

export async function deleteProspectScreenshot(storageKey: string): Promise<void> {
  if (!storageKey) return;
  await withStore("readwrite", (store) => store.delete(storageKey));
}

export async function copyProspectScreenshot(sourceKey: string, targetDealId: string): Promise<string> {
  const source = await getProspectScreenshot(sourceKey);
  if (!source) return "";
  const key = prospectScreenshotKey(targetDealId);
  await withStore("readwrite", (store) => store.put({
    ...source,
    key,
    dealId: targetDealId,
    updatedAt: new Date().toISOString(),
  }));
  return key;
}

async function optimizeScreenshot(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("画像を読み込めませんでした。別のPNG・JPEG・WebP画像をお試しください。");
  }
  try {
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!webp) return file;
    return scale < 1 || webp.size < file.size ? webp : file;
  } finally {
    bitmap.close();
  }
}
