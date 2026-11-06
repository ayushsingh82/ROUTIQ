"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { generateStealthKeys } from "@/lib/crypto/stealth";
import { encryptKeys, exportBackup, parseBackup, WrongPasswordError, type EncryptedVault } from "@/lib/vault/crypto";
import { adoptKeys, lock, unlock } from "@/lib/vault/session";
import { store } from "@/lib/db";
import { Btn, Card, inputCls, Stat, useUnlocked } from "./ui";

export function IdentityPanel() {
  const unlocked = useUnlocked();
  const [vault, setVault] = useState<EncryptedVault | null | undefined>(undefined);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    // Never hang on "Loading…": IndexedDB can be blocked (private mode, storage policy) or slow to open.
    const timeout = setTimeout(() => {
      setVault((cur) => (cur === undefined ? null : cur));
      setMsg((m) => m ?? "Local storage did not respond. Keys can't be saved in this browser session (private mode?).");
    }, 4000);
    store
      .getVault()
      .then((v) => setVault(v ?? null))
      .catch((e) => {
        setVault(null);
        setMsg(`Local storage unavailable: ${e instanceof Error ? e.message : String(e)}`);
      })
      .finally(() => clearTimeout(timeout));
    return () => clearTimeout(timeout);
  }, []);

  async function create() {
    setMsg(null);
    if (pw !== pw2) return setMsg("Passwords do not match");
    setBusy(true);
    try {
      const keys = generateStealthKeys();
      const v = await encryptKeys(pw, keys);
      await store.putVault(v);
      setVault(v);
      adoptKeys(keys);
      setPw("");
      setPw2("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doUnlock() {
    if (!vault) return;
    setMsg(null);
    setBusy(true);
    try {
      await unlock(pw, vault);
      setPw("");
    } catch (e) {
      setMsg(e instanceof WrongPasswordError ? "Wrong password" : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    setMsg(null);
    try {
      const v = parseBackup(importText);
      await store.putVault(v);
      setVault(v);
      lock();
      setImportText("");
      setMsg("Backup imported. Unlock it with its password.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  function download() {
    if (!vault) return;
    const url = URL.createObjectURL(new Blob([exportBackup(vault)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "stealthradar-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function wipe() {
    if (!confirm("Delete the vault, matched announcements and payments from this browser? Without a backup the keys are gone forever.")) return;
    lock();
    await store.deleteAll();
    setVault(null);
  }

  if (vault === undefined) return <Card title="Stealth identity"><div className="flex items-center gap-3 text-sm text-mint/70"><span className="spinner" />Loading…</div></Card>;

  return (
    <div className="space-y-4">
      {!vault && (
        <>
          <Card title="Create stealth identity">
            <p className="mb-3 text-xs text-zinc-400">
              Generates a spending key and a viewing key in your browser, encrypted with your password (PBKDF2 → AES-GCM) in IndexedDB.
              Nothing is sent anywhere. If you lose the password and backup, the keys are unrecoverable.
            </p>
            <div className="max-w-sm space-y-2">
              <input className={inputCls} type="password" placeholder="Password (min 8 chars)" value={pw} onChange={(e) => setPw(e.target.value)} />
              <input className={inputCls} type="password" placeholder="Repeat password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              <Btn onClick={create} disabled={busy || pw.length < 8}>
                {busy ? "Generating…" : "Generate identity"}
              </Btn>
            </div>
          </Card>
          <Card title="Or import an encrypted backup">
            <textarea className={`${inputCls} h-24`} placeholder="Paste backup JSON" value={importText} onChange={(e) => setImportText(e.target.value)} />
            <div className="mt-2">
              <Btn variant="ghost" onClick={doImport} disabled={!importText}>
                Import backup
              </Btn>
            </div>
          </Card>
        </>
      )}

      {vault && (
        <Card
          title="Your stealth meta-address"
          right={
            unlocked ? (
              <Btn variant="ghost" onClick={lock}>
                Lock
              </Btn>
            ) : null
          }
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <Stat label="Meta-address (public — share this)" value={vault.metaAddress} />
              <div className="grid gap-3 md:grid-cols-2">
                <Stat label="Spending public key" value={vault.spendingPublicKey} />
                <Stat label="Viewing public key" value={vault.viewingPublicKey} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="ghost" onClick={() => navigator.clipboard.writeText(vault.metaAddress)}>
                  Copy
                </Btn>
                <Btn variant="ghost" onClick={download}>
                  Export encrypted backup
                </Btn>
                <Btn variant="danger" onClick={wipe}>
                  Delete local data
                </Btn>
              </div>
            </div>
            <div className="h-fit rounded-lg bg-white p-3">
              <QRCodeSVG value={vault.metaAddress} size={150} />
            </div>
          </div>
          {!unlocked && (
            <div className="mt-4 max-w-sm space-y-2 border-t border-white/10 pt-4">
              <div className="text-xs text-zinc-400">Vault is locked. Unlock to scan for payments.</div>
              <input
                className={inputCls}
                type="password"
                placeholder="Password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doUnlock()}
              />
              <Btn onClick={doUnlock} disabled={busy || !pw}>
                {busy ? "Unlocking…" : "Unlock"}
              </Btn>
            </div>
          )}
          {unlocked && <p className="mt-3 text-xs text-accent">Unlocked · auto-locks after 5 min of inactivity. Private keys are never displayed.</p>}
        </Card>
      )}
      {msg && <p className="text-sm text-amber-400">{msg}</p>}
    </div>
  );
}
