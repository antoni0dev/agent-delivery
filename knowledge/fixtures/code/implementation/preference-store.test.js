import assert from "node:assert/strict";
import test from "node:test";
import { decodePreference, defaultPreference } from "./preference-store.js";

test("uses the default for missing, malformed, partial, and future data", () => {
  assert.deepEqual(decodePreference(null), defaultPreference);
  assert.deepEqual(decodePreference("not-json"), defaultPreference);
  assert.deepEqual(decodePreference('{"schemaVersion":2,"theme":"dark"}'), defaultPreference);
  assert.deepEqual(
    decodePreference('{"schemaVersion":2,"theme":"blue","compact":true}'),
    defaultPreference,
  );
  assert.deepEqual(
    decodePreference('{"schemaVersion":3,"theme":"dark","compact":true}'),
    defaultPreference,
  );
});

test("accepts a complete version two preference", () => {
  assert.deepEqual(decodePreference('{"schemaVersion":2,"theme":"light","compact":true}'), {
    schemaVersion: 2,
    theme: "light",
    compact: true,
  });
});

test("migrates the complete version one shape", () => {
  assert.deepEqual(decodePreference('{"schemaVersion":1,"darkMode":true}'), {
    schemaVersion: 2,
    theme: "dark",
    compact: false,
  });
  assert.deepEqual(decodePreference('{"schemaVersion":1,"darkMode":false}'), {
    schemaVersion: 2,
    theme: "light",
    compact: false,
  });
});

test("returns fresh values instead of exposing mutable shared state", () => {
  const first = decodePreference('{"schemaVersion":2,"theme":"dark","compact":false}');
  first.theme = "light";
  assert.deepEqual(decodePreference('{"schemaVersion":2,"theme":"dark","compact":false}'), {
    schemaVersion: 2,
    theme: "dark",
    compact: false,
  });
});
