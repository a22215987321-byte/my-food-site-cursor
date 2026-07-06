import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidEmail,
  normalizeEmail,
  parseWaitlistIntent,
  intentLabel,
} from "../lib/waitlist.js";

test("normalizeEmail lowercases and trims", () => {
  assert.equal(normalizeEmail("  Test@Example.COM  "), "test@example.com");
});

test("isValidEmail accepts common addresses", () => {
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("bad"), false);
  assert.equal(isValidEmail(""), false);
});

test("parseWaitlistIntent accepts notify and pro", () => {
  assert.equal(parseWaitlistIntent("pro"), "pro");
  assert.equal(parseWaitlistIntent("notify"), "notify");
  assert.equal(parseWaitlistIntent("invalid"), null);
});

test("intentLabel maps correctly", () => {
  assert.equal(intentLabel("pro"), "想試用 Pro");
  assert.equal(intentLabel("notify"), "加入等待名單");
});
