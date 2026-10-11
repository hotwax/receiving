import { tuple } from './receivingDatabase';

export function createReceivingQueue(scopeName: () => string, fence: () => void) {
  const tasks: Array<{ run: () => Promise<any>; resolve: (value: any) => void; reject: (error: unknown) => void; orderId?: string }> = [];
  let running = 0;

  function drain() {
    while (tasks.length && running < 3) {
      const task = tasks.shift()!;
      running++;
      void (async () => {
        try {
          fence();
          if (!navigator.locks) throw new Error('This browser does not support Receiving background sync');
          const scope = scopeName();
          // Orders may hydrate together. Membership and receipt operations are exclusive across
          // tabs, so an earlier read cannot commit after the receipt's authoritative readback.
          task.resolve(await navigator.locks.request(scope, { mode: task.orderId ? 'shared' : 'exclusive' }, async () => {
            fence();
            return task.orderId ? navigator.locks.request(tuple(scope, task.orderId), async () => { fence(); return task.run(); }) : task.run();
          }));
        } catch (error) { task.reject(error); }
        finally { running--; drain(); }
      })();
    }
  }

  return function enqueue<T>(run: () => Promise<T>, urgent = false, orderId?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = { run, resolve, reject, orderId };
      urgent ? tasks.unshift(task) : tasks.push(task);
      drain();
    });
  };
}
