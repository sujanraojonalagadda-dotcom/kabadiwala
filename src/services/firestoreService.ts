import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.js';
import { UserProfile, TransactionRecord, RecyclerRecord } from '../types.js';

export const firestoreService = {
  /**
   * Persist or update user profile in Firestore
   */
  async saveUser(user: UserProfile): Promise<void> {
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, 'users', user.id), user, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Retrieve a user profile from Firestore
   */
  async getUser(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (!snap.exists()) return null;
      return snap.data() as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  /**
   * Persist an e-waste transaction to Firestore
   */
  async saveTransaction(tx: TransactionRecord): Promise<void> {
    const path = `transactions/${tx.id}`;
    try {
      await setDoc(doc(db, 'transactions', tx.id), tx);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Update an existing e-waste transaction (e.g. scale verification and handover)
   */
  async updateTransaction(txId: string, updates: Partial<TransactionRecord>): Promise<void> {
    const path = `transactions/${txId}`;
    try {
      await updateDoc(doc(db, 'transactions', txId), updates as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Retrieve transactions matching collector phone or recycler
   */
  async getTransactions(options: {
    collectorPhone?: string;
    recyclerId?: string;
    includeTest?: boolean;
  }): Promise<TransactionRecord[]> {
    const path = 'transactions';
    try {
      const colRef = collection(db, 'transactions');
      let q = query(colRef);
      if (options.collectorPhone) {
        q = query(colRef, where('collectorPhone', '==', options.collectorPhone));
      } else if (options.recyclerId) {
        q = query(colRef, where('recyclerId', '==', options.recyclerId));
      }

      const snap = await getDocs(q);
      const list: TransactionRecord[] = [];
      snap.forEach((d) => {
        const item = d.data() as TransactionRecord;
        if (!options.includeTest && item.is_test) return;
        list.push(item);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  /**
   * Fetch recyclers from Firestore
   */
  async getRecyclers(includeTest: boolean = false): Promise<RecyclerRecord[]> {
    const path = 'recyclers';
    try {
      const snap = await getDocs(collection(db, 'recyclers'));
      const list: RecyclerRecord[] = [];
      snap.forEach((d) => {
        const r = d.data() as RecyclerRecord;
        if (!includeTest && r.is_test) return;
        list.push(r);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  /**
   * Persist a recycler facility record
   */
  async saveRecycler(rec: RecyclerRecord): Promise<void> {
    const path = `recyclers/${rec.id}`;
    try {
      await setDoc(doc(db, 'recyclers', rec.id), rec, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
};
