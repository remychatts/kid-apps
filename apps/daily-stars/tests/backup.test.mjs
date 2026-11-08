/** Tests the existing stash server protocol without sending children's data. */
import test from "node:test";
import assert from "node:assert/strict";
import { pushBackup, restoreBackup, backupUrl } from "../src/backup.ts";
import { initialState, STORAGE_KEY } from "../src/model.ts";
test("backup names support Unicode and keep distinct punctuation distinct", () => {
  assert.equal(backupUrl(" Alex "), "/stash/daily-stars/alex.json");
  assert.notEqual(backupUrl("A B"), backupUrl("A-B"));
  assert.notEqual(backupUrl("星"), backupUrl("月"));
});
test("upload creates a missing directory, retries, and sends no password", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, ...options });
    return new Response(null, { status: calls.length === 1 ? 409 : 201 });
  });
  const state = initialState("Alex");
  await pushBackup(state, "private-password");
  assert.deepEqual(
    calls.map((c) => c.method),
    ["PUT", "MKCOL", "PUT"],
  );
  assert.equal(calls[1].url, "/stash/daily-stars");
  assert.deepEqual(JSON.parse(JSON.parse(calls[2].body)[STORAGE_KEY]), state);
  assert.ok(!calls[2].body.includes("private-password"));
});
test("restore validates contents and rejects a different child without applying data", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({ [STORAGE_KEY]: JSON.stringify(initialState("Alex")) }),
      ),
  );
  assert.equal((await restoreBackup("Alex", "password")).name, "Alex");
  await assert.rejects(restoreBackup("Taylor", "password"), /different name/);
});
test("authentication failure is reported and never retried as directory creation", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response(null, { status: 401 });
  });
  await assert.rejects(pushBackup(initialState("Alex"), "wrong"), /password/);
  assert.equal(calls, 1);
});
