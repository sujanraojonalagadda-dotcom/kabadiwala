import QRCode from 'qrcode';
import { TransactionRecord } from '../types.js';
import { offlineService } from './offlineService.js';
import { firestoreService } from './firestoreService.js';

class TransactionService {
  /**
   * Create a new transaction (or enqueue if offline)
   */
  public async createTransaction(
    data: Partial<TransactionRecord>
  ): Promise<{ success: boolean; transaction?: TransactionRecord; offlineQueued?: boolean }> {
    if (!offlineService.isOnline()) {
      offlineService.enqueueTransaction(data);
      return { success: true, offlineQueued: true };
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success && result.transaction) {
        firestoreService
          .saveTransaction(result.transaction)
          .catch((err) => console.warn('Firestore transaction sync warning:', err));
      }
      return result;
    } catch {
      offlineService.enqueueTransaction(data);
      return { success: true, offlineQueued: true };
    }
  }

  /**
   * Fetch all transactions for collector or recycler
   */
  public async getTransactions(options: {
    collectorPhone?: string;
    recyclerId?: string;
    includeTest: boolean;
  }): Promise<TransactionRecord[]> {
    if (!offlineService.isOnline()) {
      return offlineService.getCachedTransactions();
    }

    try {
      const params = new URLSearchParams();
      if (options.collectorPhone) params.append('collectorPhone', options.collectorPhone);
      if (options.recyclerId) params.append('recyclerId', options.recyclerId);
      if (options.includeTest) params.append('includeTest', 'true');

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Fetch failed');

      const data = await res.json();
      const list: TransactionRecord[] = data.transactions || [];
      offlineService.cacheTransactions(list);
      return list;
    } catch {
      // Fallback to direct Firestore read if available
      try {
        const firestoreList = await firestoreService.getTransactions(options);
        if (firestoreList && firestoreList.length > 0) {
          offlineService.cacheTransactions(firestoreList);
          return firestoreList;
        }
      } catch (fErr) {
        console.warn('Firestore fallback fetch warning:', fErr);
      }
      return offlineService.getCachedTransactions();
    }
  }

  /**
   * Recycler verifies handover by OTP & sets final confirmed weight and price
   */
  public async verifyHandover(params: {
    transactionId: string;
    otp: string;
    finalWeightKg: number;
    finalPrice: number;
    recyclerId: string;
    recyclerName: string;
  }): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string }> {
    try {
      const res = await fetch(`/api/transactions/${params.transactionId}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Handover verification failed' };
      }
      if (data.success && data.transaction) {
        firestoreService
          .updateTransaction(data.transaction.id, {
            status: data.transaction.status,
            finalWeightKg: data.transaction.finalWeightKg,
            finalPrice: data.transaction.finalPrice,
            recyclerId: data.transaction.recyclerId,
            recyclerName: data.transaction.recyclerName,
            tamperHash: data.transaction.tamperHash,
            timestamps: data.transaction.timestamps,
          })
          .catch((err) => console.warn('Firestore transaction update warning:', err));
      }
      return { success: true, transaction: data.transaction };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failure during handover verification' };
    }
  }

  /**
   * Generate QR Code data URL for recycler scanning
   */
  public async generateQrData(payload: object): Promise<string> {
    try {
      return await QRCode.toDataURL(JSON.stringify(payload), {
        margin: 2,
        width: 260,
        color: {
          dark: '#111827',
          light: '#FFFFFF',
        },
      });
    } catch (err) {
      console.error('QR code generation error:', err);
      return '';
    }
  }
}

export const transactionService = new TransactionService();
