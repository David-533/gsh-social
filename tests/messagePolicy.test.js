import test from "node:test";
import assert from "node:assert/strict";
import { canRespondToRequest, canSendInConversation, conversationSection } from "../src/utils/messagePolicy.js";

const pending = { senderId: "alice", recipientId: "bob", participants: ["alice", "bob"], status: "pending" };

test("only the recipient can accept or refuse a pending request", () => {
  assert.equal(canRespondToRequest(pending, "bob"), true);
  assert.equal(canRespondToRequest(pending, "alice"), false);
  assert.equal(canRespondToRequest(pending, "other"), false);
});

test("a pending request cannot receive additional messages", () => {
  assert.equal(canSendInConversation(pending, "alice"), false);
  assert.equal(canSendInConversation(pending, "bob"), false);
});

test("accepted conversations permit participants, not strangers", () => {
  const accepted = { ...pending, status: "accepted" };
  assert.equal(canSendInConversation(accepted, "alice"), true);
  assert.equal(canSendInConversation(accepted, "bob"), true);
  assert.equal(canSendInConversation(accepted, "other"), false);
  assert.equal(canSendInConversation({ ...pending, status: "declined" }, "alice"), false);
});

test("requests are separated from sent requests and accepted conversations", () => {
  assert.equal(conversationSection(pending, "bob"), "requests");
  assert.equal(conversationSection(pending, "alice"), "sent");
  assert.equal(conversationSection({ ...pending, status: "declined" }, "alice"), "sent");
  assert.equal(conversationSection({ ...pending, status: "accepted" }, "bob"), "conversations");
});