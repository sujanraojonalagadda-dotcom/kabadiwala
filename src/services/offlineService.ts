import { TransactionRecord } from '../types.js';

const STORAGE_KEY_OFFLINE_QUEUE = 'kabadiwala_offline_queue';
const STORAGE_KEY_LOCAL_CACHE = 'kabadiwala_cached_txs';

class OfflineService {
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private onlineListeners: Array<(isOnline: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnlineStatus = true;
        this.notifyListeners();
        this.syncOfflineQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnlineStatus = false;
        this.notifyListeners();
      });
    }
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public subscribeOnline(callback: (isOnline: boolean) => void): () => void {
    this.onlineListeners.push(callback);
    callback(this.isOnlineStatus);
    return () => {
      this.onlineListeners = this.onlineListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    this.onlineListeners.forEach((cb) => cb(this.isOnlineStatus));
  }

  public getOfflineQueue(): Partial<TransactionRecord>[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public enqueueTransaction(tx: Partial<TransactionRecord>) {
    const queue = this.getOfflineQueue();
    queue.push(tx);
    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue));
  }

  public async syncOfflineQueue(): Promise<{ syncedCount: number }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0 };

    let syncedCount = 0;
    const remaining: Partial<TransactionRecord>[] = [];

    for (const item of queue) {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          syncedCount++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(remaining));
    return { syncedCount };
  }

  public cacheTransactions(txs: TransactionRecord[]) {
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_CACHE, JSON.stringify(txs));
    } catch {
      // Storage quota exceeded or disabled
    }
  }

  public getCachedTransactions(): TransactionRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOCAL_CACHE);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

export const offlineService = new OfflineService();
