// IndexedDB persistence. Stores ONLY: the encrypted vault, matched announcements, detected payments, scan cursor.
// No private keys, ever (the vault blob is ciphertext).

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { EncryptedVault } from "../vault/crypto.ts";
import type { DetectedPayment, MatchedAnnouncement } from "../scanner/types.ts";

export interface ScanState {
  chainId: number;
  lastScannedBlock: string;
  lastScanAt: number;
}

interface Schema extends DBSchema {
  vault: { key: string; value: EncryptedVault };
  announcements: { key: string; value: MatchedAnnouncement };
  payments: { key: string; value: DetectedPayment };
  scanState: { key: number; value: ScanState };
}

let dbp: Promise<IDBPDatabase<Schema>> | null = null;
function db() {
  dbp ??= openDB<Schema>("stealthradar", 1, {
    upgrade(d) {
      d.createObjectStore("vault");
      d.createObjectStore("announcements", { keyPath: "id" });
      d.createObjectStore("payments", { keyPath: "id" });
      d.createObjectStore("scanState", { keyPath: "chainId" });
    },
  });
  return dbp;
}

export const store = {
  async getVault() {
    return (await db()).get("vault", "identity");
  },
  async putVault(v: EncryptedVault) {
    await (await db()).put("vault", v, "identity");
  },
  async putAnnouncement(a: MatchedAnnouncement) {
    await (await db()).put("announcements", a);
  },
  async announcementIds(): Promise<Set<string>> {
    return new Set(await (await db()).getAllKeys("announcements"));
  },
  async allAnnouncements() {
    return (await db()).getAll("announcements");
  },
  async putPayment(p: DetectedPayment) {
    await (await db()).put("payments", p);
  },
  async allPayments() {
    return (await db()).getAll("payments");
  },
  async getScanState(chainId: number) {
    return (await db()).get("scanState", chainId);
  },
  async putScanState(s: ScanState) {
    await (await db()).put("scanState", s);
  },
  /** Wipes everything including the vault. */
  async deleteAll() {
    const d = await db();
    const tx = d.transaction(["vault", "announcements", "payments", "scanState"], "readwrite");
    await Promise.all([
      tx.objectStore("vault").clear(),
      tx.objectStore("announcements").clear(),
      tx.objectStore("payments").clear(),
      tx.objectStore("scanState").clear(),
      tx.done,
    ]);
  },
};
