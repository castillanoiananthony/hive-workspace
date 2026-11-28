// Browser-only storage for offline use (IndexedDB, no library): a snapshot of your tasks, and check-offs made offline.

export type OfflineTask = { key: string; type: "task" | "part"; id: string; title: string; context: string; due: string | null; done: boolean; color: string | null };
export type OfflineOp = { key: string; type: "task" | "part"; id: string; done: boolean; at: string };

const DB = "hive-offline", VERSION = 1;
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, VERSION);
    r.onupgradeneeded = () => { r.result.createObjectStore("tasks", { keyPath: "key" }); r.result.createObjectStore("ops", { keyPath: "key" }); r.result.createObjectStore("meta"); };
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode), req = fn(t.objectStore(store));
    t.oncomplete = () => { resolve((req as IDBRequest | undefined)?.result as T); db.close(); };
    t.onerror = () => { reject(t.error); db.close(); };
  });
}

export const getTasks = () => tx<OfflineTask[]>("tasks", "readonly", (s) => s.getAll());
export const getOps = () => tx<OfflineOp[]>("ops", "readonly", (s) => s.getAll());
export const getSavedAt = () => tx<string | undefined>("meta", "readonly", (s) => s.get("savedAt"));

/** Replaces the snapshot, keeping any check-offs that haven't synced yet applied on top. */
export async function saveTasks(tasks: OfflineTask[]) {
  const ops = await getOps();
  const merged = tasks.map((t) => { const op = ops.find((o) => o.key === t.key); return op ? { ...t, done: op.done } : t; });
  await tx("tasks", "readwrite", (s) => { s.clear(); merged.forEach((t) => s.put(t)); });
  await tx("meta", "readwrite", (s) => s.put(new Date().toISOString(), "savedAt"));
}

/** A tick made offline: shows straight away and waits in the queue until it syncs. */
export async function queueTick(t: OfflineTask, done: boolean) {
  await tx("tasks", "readwrite", (s) => s.put({ ...t, done }));
  await tx("ops", "readwrite", (s) => s.put({ key: t.key, type: t.type, id: t.id, done, at: new Date().toISOString() }));
}
export const clearOps = (keys: string[]) => tx("ops", "readwrite", (s) => { keys.forEach((k) => s.delete(k)); });

/** On sign-out: nothing of yours stays on the device. */
export function wipe() { return new Promise<void>((resolve) => { const r = indexedDB.deleteDatabase(DB); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); }
