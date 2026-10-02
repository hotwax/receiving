interface RefreshTasks {
  membership(): Promise<unknown>;
  pendingIds(): Promise<string[]>;
  detail(orderId: string): Promise<unknown>;
  history(orderId: string): Promise<unknown>;
  stopped(): boolean;
}

// Membership has its own backoff. Saved orders and the open detail remain
// refreshable even when enumeration is unavailable or the order is completed.
export function createReceivingSync(tasks: RefreshTasks) {
  let activeOrder: string | undefined;
  let failures = 0, retryAfter = 0;
  let inFlight: Promise<void> | undefined;
  const orders = new Map<string, Promise<unknown>>();

  async function run(force: boolean) {
    let membershipError: unknown;
    if (force || Date.now() >= retryAfter) {
      try {
        await tasks.membership();
        failures = 0; retryAfter = 0;
      } catch (error) {
        membershipError = error;
        retryAfter = Date.now() + Math.min(300000, 30000 * 2 ** Math.min(failures++, 4));
      }
    }
    const ids = new Set(await tasks.pendingIds());
    if (activeOrder) ids.add(activeOrder);
    for (const id of ids) {
      if (tasks.stopped() || orders.has(id)) continue;
      const job = tasks.detail(id).catch(() => undefined)
        .then(() => tasks.stopped() ? undefined : tasks.history(id))
        .catch(() => undefined).finally(() => orders.delete(id));
      orders.set(id, job);
    }
    if (membershipError) throw membershipError;
  }

  return {
    setActiveOrder(orderId?: string) { activeOrder = orderId; },
    sync(force = false): Promise<void> {
      if (!inFlight) inFlight = run(force).finally(() => { inFlight = undefined; });
      return inFlight;
    },
  };
}
