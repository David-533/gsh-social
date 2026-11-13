import test from "node:test";
import assert from "node:assert/strict";
import { filterPublicFeed } from "../src/utils/followedFeed.js";

const timestamp = value => ({ toMillis: () => value });
const testPosts = [
  { id: "own", authorId: "current", surface: "feed", createdAt: timestamp(4) },
  { id: "followed-feed", authorId: "followed", surface: "feed", createdAt: timestamp(2) },
  { id: "followed-profile", authorId: "followed", surface: "profile", createdAt: timestamp(3) },
  { id: "stranger", authorId: "stranger", surface: "feed", createdAt: timestamp(5) },
];

test("the feed shows posts from followed and unfollowed members, never the current user or profile posts", () => {
  const posts = filterPublicFeed(testPosts, "current");
  assert.deepEqual(posts.map(post => post.id), ["stranger", "followed-feed"]);
});

test("legacy posts without a feed surface stay out of the news feed", () => {
  const posts = filterPublicFeed([
    { id: "legacy", authorId: "followed" },
  ], "current");
  assert.deepEqual(posts, []);
});