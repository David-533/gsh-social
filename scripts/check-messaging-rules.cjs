const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const { initializeTestEnvironment, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
const requireFromTestTools = createRequire(require.resolve("@firebase/rules-unit-testing"));
const { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } = requireFromTestTools("firebase/firestore");

const projectId = "demo-gsh-messaging";

async function main() {
  const environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  try {
    await environment.withSecurityRulesDisabled(async context => {
      const database = context.firestore();
      for (const uid of ["alice", "bob", "charlie", "dana", "eve"]) {
        await setDoc(doc(database, "users", uid), { pseudo: uid, usernameLower: uid });
      }
      await setDoc(doc(database, "users", "charlie", "following", "dana"), { uid: "dana" });
      await setDoc(doc(database, "users", "dana", "following", "charlie"), { uid: "charlie" });
    });

    const alice = environment.authenticatedContext("alice").firestore();
    const bob = environment.authenticatedContext("bob").firestore();
    const charlie = environment.authenticatedContext("charlie").firestore();
    const dana = environment.authenticatedContext("dana").firestore();
    const eve = environment.authenticatedContext("eve").firestore();
    const anonymous = environment.unauthenticatedContext().firestore();
    const request = (senderId, recipientId, status = "pending") => ({
      senderId, recipientId, participants: [senderId, recipientId], status,
      initialText: "Bonjour", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    const message = senderId => ({ senderId, text: "Bonjour", createdAt: serverTimestamp() });

    await assertSucceeds(setDoc(doc(alice, "conversations", "alice_bob"), request("alice", "bob")));
    await assertSucceeds(getDoc(doc(bob, "conversations", "alice_bob")));
    await assertSucceeds(getDocs(query(collection(bob, "conversations"), where("participants", "array-contains", "bob"))));
    await assertFails(getDoc(doc(eve, "conversations", "alice_bob")));
    await assertFails(getDoc(doc(anonymous, "conversations", "alice_bob")));
    await assertFails(getDocs(query(collection(eve, "conversations"), where("participants", "array-contains", "bob"))));
    await assertFails(setDoc(doc(alice, "conversations", "alternate-id"), request("alice", "bob")));
    await assertFails(setDoc(doc(alice, "conversations", "alice_charlie"), { ...request("alice", "charlie"), senderId: "bob" }));
    await assertFails(setDoc(doc(alice, "conversations", "alice_bob", "messages", "before"), message("alice")));
    await assertFails(setDoc(doc(bob, "conversations", "alice_bob", "messages", "before"), message("bob")));
    await assertFails(updateDoc(doc(alice, "conversations", "alice_bob"), { status: "accepted", updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(alice, "conversations", "alice_bob"), request("alice", "bob")));
    await assertSucceeds(updateDoc(doc(bob, "conversations", "alice_bob"), { status: "accepted", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(bob, "conversations", "alice_bob"), { initialText: "Modifié", updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(alice, "conversations", "alice_bob", "messages", "one"), message("alice")));
    await assertSucceeds(setDoc(doc(bob, "conversations", "alice_bob", "messages", "two"), message("bob")));
    await assertFails(getDoc(doc(eve, "conversations", "alice_bob", "messages", "one")));
    await assertFails(setDoc(doc(eve, "conversations", "alice_bob", "messages", "forged"), message("eve")));
    await assertSucceeds(setDoc(doc(bob, "users", "bob", "blocked", "alice"), { uid: "alice", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(bob, "conversations", "bob_alice"), request("bob", "alice")));
    await assertFails(getDocs(collection(alice, "users", "bob", "blocked")));
    await assertFails(setDoc(doc(alice, "conversations", "alice_bob", "messages", "blocked"), message("alice")));
    await assertFails(setDoc(doc(bob, "conversations", "alice_bob", "messages", "blocked"), message("bob")));
    await assertFails(setDoc(doc(eve, "conversations", "eve_dana"), request("eve", "dana", "accepted")));
    await assertSucceeds(setDoc(doc(charlie, "conversations", "charlie_dana"), request("charlie", "dana", "accepted")));
    await assertSucceeds(setDoc(doc(dana, "conversations", "charlie_dana", "messages", "direct"), message("dana")));
    await assertSucceeds(setDoc(doc(eve, "conversations", "eve_bob"), request("eve", "bob")));
    await assertSucceeds(updateDoc(doc(bob, "conversations", "eve_bob"), { status: "declined", updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(eve, "conversations", "eve_bob", "messages", "refused"), message("eve")));
    await assertFails(setDoc(doc(alice, "users", "bob", "blocked", "eve"), { uid: "eve", createdAt: serverTimestamp() }));
    console.log("Contrôles de sécurité Firestore réussis.");
  } finally {
    await environment.cleanup();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });