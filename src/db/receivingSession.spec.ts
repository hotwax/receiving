// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ token: '' }));
vi.mock('@common/utils/commonUtil', () => ({ commonUtil: {
  isMoqui: () => true, isAppEmbedded: () => false,
  getTokenExpiration: () => Date.now() + 3600000,
  getToken: () => session.token,
  getMaargURL: () => 'https://demo-test.invalid',
  getOmsURL: () => 'https://demo-test.invalid',
} }));
vi.mock('@common/core/logger', () => ({ default: {} }));
vi.mock('@common/core/i18n', () => ({ translate: (text: string) => text }));
vi.mock('@common/core/remoteApi', () => ({ default: vi.fn() }));
vi.mock('@common/store/embeddedApp', () => ({ useEmbeddedAppStore: vi.fn() }));
vi.mock('@common/utils/appVersionUtil', () => ({ getCanonicalPath: vi.fn() }));
vi.mock('./receivingClient', () => ({
  configureReceiving: vi.fn(), enableReceivingSession: vi.fn(),
  receivingScope: (...parts: string[]) => JSON.stringify(parts),
}));

import { useAuth } from '@common/composables/useAuth';
import { accxuiConfig } from '@common/core/configRegistry';
import { configureReceiving, enableReceivingSession } from './receivingClient';
import { beginReceivingLogin, finishReceivingLogin, receivingLoginReady, syncReceivingSession } from './receivingSession';

describe('Receiving login lifecycle with unchanged shared auth', () => {
  const auth = useAuth();
  beforeEach(() => {
    auth.clearAuth();
    auth.updateOMS('demo-test');
    accxuiConfig.value.oms = 'demo-test';
    accxuiConfig.value.current = {};
    session.token = '';
    receivingLoginReady.value = true;
    vi.clearAllMocks();
  });

  function supplyProfile() {
    session.token = 'test-token';
    auth.updateToken(session.token, String(Date.now() + 3600000));
    accxuiConfig.value.current = { userId: 'U1' };
    auth.updateUserId('U1');
  }

  it('starts after login setup despite a previously evaluated false auth computed, including re-login', () => {
    const retainedAuth = auth.isAuthenticated;
    for (let attempt = 0; attempt < 2; attempt++) {
      beginReceivingLogin();
      session.token = 'test-token';
      auth.updateToken(session.token, String(Date.now() + 3600000));
      expect(retainedAuth.value).toBe(false);
      accxuiConfig.value.current = { userId: 'U1' };
      auth.updateUserId('U1');
      syncReceivingSession('F1', 'U1');
      expect(configureReceiving).toHaveBeenLastCalledWith();
      finishReceivingLogin();
      syncReceivingSession('F1', 'U1');
      expect(enableReceivingSession).toHaveBeenCalled();
      expect(configureReceiving).toHaveBeenLastCalledWith(expect.objectContaining({ facilityId: 'F1', token: 'test-token' }));
      auth.clearAuth();
      session.token = '';
      accxuiConfig.value.current = {};
      syncReceivingSession('F1', 'U1');
      expect(configureReceiving).toHaveBeenLastCalledWith();
    }
  });

  it('resumes a saved session and reconfigures for facility changes', () => {
    supplyProfile();
    syncReceivingSession('F1', 'U1');
    expect(configureReceiving).toHaveBeenLastCalledWith(expect.objectContaining({ facilityId: 'F1' }));
    syncReceivingSession('F2', 'U1');
    expect(configureReceiving).toHaveBeenLastCalledWith(expect.objectContaining({ facilityId: 'F2' }));
  });

  it('does not start for incomplete login, expired auth, or a mismatched profile', () => {
    beginReceivingLogin();
    supplyProfile();
    syncReceivingSession('F1', 'U1');
    expect(configureReceiving).toHaveBeenLastCalledWith();
    finishReceivingLogin();
    auth.updateToken(session.token, String(Date.now() - 1000));
    syncReceivingSession('F1', 'U1');
    expect(configureReceiving).toHaveBeenLastCalledWith();
    auth.updateToken(session.token, String(Date.now() + 3600000));
    accxuiConfig.value.current = { userId: 'U2' };
    syncReceivingSession('F1', 'U2');
    expect(configureReceiving).toHaveBeenLastCalledWith();
  });
});
