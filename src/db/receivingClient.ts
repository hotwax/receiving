import { proxy, type Remote } from 'comlink';
import { shallowRef } from 'vue';
import { WorkerFactory } from '@common/core/workerFactory';
import receivingWorkerUrl from './receiving.worker.ts?worker&url';
import { ReceivingDB, openReceivingDb, clearReceivingData, tuple, type Row } from './receivingDatabase';
import type { ReceivingConnection } from './receivingApi';
import type { ReceivingWorker } from './receiving.worker';
import { findExactTracking } from './receivingQueries';

export const receivingDb = shallowRef<ReceivingDB>();
export const receivingList = shallowRef<{ list: Row[]; total: number; sync?: Row }>({ list: [], total: 0 });
export const receivingError = shallowRef('');
let nativeWorker: Worker | undefined;
let remote: Remote<ReceivingWorker> | undefined;
let active: ReceivingConnection | undefined;
let ready: Promise<void> = Promise.resolve();
let generation = 0;
let sessionController = new AbortController();
let sessionEnabled = true;
let searchText = '', pageLimit = 20;
const sessionChannel = new BroadcastChannel('receiving-session');
sessionChannel.onmessage = event => {
  if (event.data?.type === 'logout' && event.data?.scope === active?.scope) {
    sessionEnabled = false;
    configureReceiving();
  }
};

export function receivingScope(maargUrl: string, omsUrl: string, userId: string) {
  const normalize = (url: string) => url.trim() ? new URL(url.trim()).href.replace(/\/+$/, '') : '';
  return tuple(normalize(maargUrl), normalize(omsUrl), userId);
}

export function configureReceiving(connection?: ReceivingConnection) {
  if (connection && !sessionEnabled) return ready;
  if (connection && active?.scope === connection.scope && active.facilityId === connection.facilityId) {
    if (active.token !== connection.token) {
      const currentGeneration = generation;
      void ready.then(() => currentGeneration === generation ? remote?.updateToken(connection.token) : undefined).catch(() => undefined);
    }
    active = connection;
    return ready;
  }
  const currentGeneration = ++generation;
  sessionController.abort();
  sessionController = new AbortController();
  nativeWorker?.terminate(); nativeWorker = undefined; remote = undefined;
  receivingDb.value?.close(); receivingDb.value = undefined;
  active = connection;
  receivingList.value = { list: [], total: 0 };
  receivingError.value = '';
  if (!connection) return ready = Promise.resolve();
  const db = new ReceivingDB(connection.scope);
  receivingDb.value = db;
  const handle = WorkerFactory.createWorker<ReceivingWorker>(new URL(receivingWorkerUrl, import.meta.url));
  nativeWorker = handle.worker;
  const worker = handle.api;
  remote = worker;
  ready = (async () => {
    await openReceivingDb(db);
    if (currentGeneration !== generation) return;
    await worker.start(connection);
    if (currentGeneration !== generation) return;
    await worker.watchList(proxy((value: any) => {
      if (currentGeneration === generation) receivingList.value = value;
    }));
    await worker.search(searchText, pageLimit);
  })().catch(() => {
    if (currentGeneration === generation) receivingError.value = 'Local transfer storage could not start. Refresh to retry.';
  });
  return ready;
}

function inSession<T>(signal: AbortSignal, operation: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const changed = () => reject(new Error('Receiving session changed. Reopen the transfer before continuing.'));
    if (signal.aborted) { changed(); return; }
    signal.addEventListener('abort', changed, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', changed));
  });
}

async function withWorker<T>(operation: (worker: Remote<ReceivingWorker>) => Promise<T>): Promise<T> {
  const signal = sessionController.signal, target = remote;
  await inSession(signal, ready);
  if (!target || signal.aborted || receivingError.value) throw new Error(receivingError.value || 'Select a receiving facility first.');
  return inSession(signal, operation(target));
}

export async function getReceivingDb() {
  const signal = sessionController.signal, db = receivingDb.value;
  await inSession(signal, ready);
  if (!db || signal.aborted || receivingError.value) throw new Error(receivingError.value || 'Select a receiving facility first.');
  return db;
}

export async function searchReceiving(query: string, limit: number) {
  searchText = query; pageLimit = limit;
  if (remote) await withWorker(worker => worker.search(query, limit));
}
export async function refreshReceiving() { await withWorker(worker => worker.refresh()); }
export async function resolveReceivingTracking(code: string) {
  const connection = active;
  const db = await getReceivingDb();
  const orders = await findExactTracking(db, connection!.facilityId, code);
  if (connection?.scope !== active?.scope || connection?.facilityId !== active?.facilityId) return [];
  return orders;
}
export async function setActiveReceivingOrder(orderId?: string) { await withWorker(worker => worker.setActiveOrder(orderId)); }
export async function ensureReceivingOrder(orderId: string, force = false) { await withWorker(worker => worker.ensureOrder(orderId, force)); }
export async function ensureReceivingHistory(orderId: string) { await withWorker(worker => worker.history(orderId)); }
export async function loadReceivingTracking(orderIds: string[]) { return withWorker(worker => worker.orderTracking(orderIds)); }
export async function submitReceipt(orderId: string, payload: Row, baseline: Row[]) {
  return withWorker(worker => worker.receive(orderId, JSON.parse(JSON.stringify(payload)), JSON.parse(JSON.stringify(baseline))));
}

export async function clearReceivingSession() {
  sessionEnabled = false;
  const old = receivingDb.value;
  const previousScope = active?.scope;
  if (previousScope) {
    const channel = new BroadcastChannel('receiving-session');
    channel.postMessage({ type: 'logout', scope: previousScope });
    channel.close();
  }
  // Termination fences all in-flight reads before logout removes local data.
  configureReceiving();
  if (!old) return;
  const clear = async () => {
    try {
      await clearReceivingData(old);
    } finally { old.close(); }
  };
  if (navigator.locks) await navigator.locks.request(old.name, clear);
  else await clear();
}

export function enableReceivingSession() { sessionEnabled = true; }
