// Logging out in one tab must send the other tabs of that session to Login (#750).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  channel: undefined as { onmessage?: (event: { data: unknown }) => void } | undefined,
}));

vi.mock('@common/core/remoteApi', () => ({ default: vi.fn() }));
vi.mock('@common/utils/commonUtil', () => ({ commonUtil: { hasError: () => false } }));
vi.mock('@common/db/sync/syncService', () => ({
  serviceState: { running: false, written: {}, errors: {} },
  createSyncService: () => ({ start: async () => {}, stop: async () => {}, refetchOne: async () => 1, syncDomainNow: async () => {}, setDomains: async () => {} }),
  clearDomainErrors() {}, clearScopeError() {}, recordSyncError() {},
}));
vi.mock('dexie', async original => ({ ...await original<any>(), liveQuery: () => ({ subscribe: () => ({ unsubscribe() {} }) }) }));
vi.mock('@/db/receivingDatabase', () => ({
  tuple: (...parts: unknown[]) => JSON.stringify(parts), cacheKeys: { hydrate: () => 'hydrate' }, readCacheState: async () => undefined,
  openReceivingDb: async () => {}, clearReceivingData: async () => {},
  receivingCache: {
    setOmsInstanceResolver() {},
    get: (scope: string) => ({ name: scope, async open() {}, close() {} }),
    raw: () => ({}),
    client: () => ({}),
  },
}));
vi.mock('@/db/receiptOperations', async original => ({
  ...await original<any>(),
  importLegacyReceipts: async () => {},
  ReceiptOperations: class { receipts = { get: async () => undefined }; close() {} },
}));

const connection = { scope: 'tenant/user', facilityId: 'A', token: 'test', maargUrl: 'https://example.invalid/rest/s1/', moqui: true };
let client: typeof import('@/db/receivingClient');

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, run: () => unknown) => run() } });
  vi.stubGlobal('BroadcastChannel', class { onmessage: unknown; constructor() { state.channel = this as any; } postMessage() {} close() {} });
  client = await import('@/db/receivingClient');
  await client.configureReceiving(connection);
});

const logoutFrom = (scope: string) => state.channel!.onmessage!({ data: { type: 'logout', scope } });

describe('Logout from another tab', () => {
  it('runs the logout handler once for the same session, even when the message repeats', () => {
    const handler = vi.fn();
    client.onRemoteReceivingLogout(handler);
    logoutFrom(connection.scope);
    logoutFrom(connection.scope);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('ignores a logout from a different session', () => {
    const handler = vi.fn();
    client.onRemoteReceivingLogout(handler);
    logoutFrom('other-tenant/other-user');
    expect(handler).not.toHaveBeenCalled();
  });
});
