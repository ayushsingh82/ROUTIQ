import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSafeEndpoint, isPrivateAddress, UnsafeEndpointError } from "./ssrf.ts";

const res = (m: Record<string, string[]>) => async (h: string) => m[h] ?? [];

test("private, link-local and metadata addresses are refused", () => {
  for (const ip of ["10.0.0.1", "172.16.5.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPrivateAddress(ip), false, ip);
});

test("public https endpoints pass; bad schemes, credentials and private DNS results fail", async () => {
  const resolver = res({ "api.example.com": ["93.184.216.34"], "evil.example.com": ["10.0.0.5"], "meta.example.com": ["169.254.169.254"] });
  await assertSafeEndpoint("https://api.example.com/v1", { resolver });
  await assert.rejects(() => assertSafeEndpoint("ftp://api.example.com", { resolver }), UnsafeEndpointError);
  await assert.rejects(() => assertSafeEndpoint("https://user:pw@api.example.com", { resolver }), UnsafeEndpointError);
  await assert.rejects(() => assertSafeEndpoint("https://evil.example.com", { resolver }), /private or reserved/);
  await assert.rejects(() => assertSafeEndpoint("https://meta.example.com", { resolver, allowLoopback: true }), /private or reserved/);
  await assert.rejects(() => assertSafeEndpoint("http://api.example.com", { resolver }), /https/);
  await assert.rejects(() => assertSafeEndpoint("not a url"), UnsafeEndpointError);
});

test("loopback is allowed only for providers flagged as local", async () => {
  await assert.rejects(() => assertSafeEndpoint("http://127.0.0.1:11434/v1"), /Loopback/);
  await assert.rejects(() => assertSafeEndpoint("http://localhost:11434/v1"), /Loopback/);
  await assertSafeEndpoint("http://127.0.0.1:11434/v1", { allowLoopback: true });
  await assertSafeEndpoint("http://localhost:11434/v1", { allowLoopback: true });
  await assert.rejects(() => assertSafeEndpoint("http://169.254.169.254/latest", { allowLoopback: true }), /private or reserved/);
});

test("an unresolvable hostname is a clean UnsafeEndpointError, not a raw DNS error", async () => {
  const failing = async () => {
    throw new Error("ENOTFOUND");
  };
  await assert.rejects(() => assertSafeEndpoint("https://nope.example", { resolver: failing }), UnsafeEndpointError);
});
