import { test } from "node:test";
import assert from "node:assert/strict";
import { compareObservations, parseEcho } from "./echo.ts";

const echo = (origin: string) => ({
  origin,
  headers: { "User-Agent": "UA/1", "Accept-Language": "en", Referer: "http://x/" },
  json: { jsonrpc: "2.0", method: "eth_getBalance", params: ["0xabc", "latest"] },
});

test("parses what the provider observed", () => {
  const o = parseEcho(echo("1.2.3.4, 5.6.7.8"));
  assert.deepEqual(o.ips, ["1.2.3.4", "5.6.7.8"]);
  assert.equal(o.userAgent, "UA/1");
  assert.equal(o.method, "eth_getBalance");
  assert.equal(o.queriedAddress, "0xabc");
});

test("tolerates garbage", () => {
  const o = parseEcho(null);
  assert.deepEqual(o.ips, []);
  assert.equal(o.method, null);
  assert.equal(parseEcho({ origin: 5, headers: 3, json: "x" }).queriedAddress, null);
});

test("verdicts", () => {
  assert.equal(compareObservations(parseEcho(echo("1.1.1.1")), parseEcho(echo("9.9.9.9"))), "unlinked");
  assert.equal(compareObservations(parseEcho(echo("1.1.1.1")), parseEcho(echo("9.9.9.9, 1.1.1.1"))), "same-ip");
  assert.equal(compareObservations(parseEcho({}), parseEcho(echo("1.1.1.1"))), "unknown");
});
