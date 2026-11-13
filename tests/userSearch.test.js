import test from "node:test";
import assert from "node:assert/strict";
import { filterSearchableUsers } from "../src/utils/userSearch.js";

const testUsers = [
  { id: "uid-marie", pseudo: "Marie", usernameLower: "marie" },
  { id: "uid-marc", pseudo: "Marc", usernameLower: "marc" },
  { id: "uid-current", pseudo: "Maxime", usernameLower: "maxime" },
  { id: "uid-amelie", pseudo: "Amélie", usernameLower: "amélie" },
];

test("finds other test users by case-insensitive pseudo prefix", () => {
  const results = filterSearchableUsers(testUsers, "  MA  ", "uid-current");
  assert.deepEqual(results.map(user => user.id), ["uid-marie", "uid-marc"]);
});

test("does not return the signed-in test user", () => {
  const results = filterSearchableUsers(testUsers, "max", "uid-current");
  assert.deepEqual(results, []);
});

test("requires at least two characters and matches prefixes, not middle fragments", () => {
  assert.deepEqual(filterSearchableUsers(testUsers, "m", "uid-current"), []);
  assert.deepEqual(filterSearchableUsers(testUsers, "rie", "uid-current"), []);
});