import test from "node:test";
import assert from "node:assert/strict";
import { canViewProfilePosts } from "../src/utils/profileVisibility.js";

test("a public profile is visible even without following", () => {
  assert.equal(canViewProfilePosts({ profilePublic: true, following: false }), true);
});

test("a private profile is visible to its owner or followers", () => {
  assert.equal(canViewProfilePosts({ profilePublic: false, following: false }), false);
  assert.equal(canViewProfilePosts({ profilePublic: false, following: true }), true);
  assert.equal(canViewProfilePosts({ profilePublic: false, isOwnProfile: true }), true);
});

test("older profiles without an explicit setting are public", () => {
  assert.equal(canViewProfilePosts({ following: false }), true);
});