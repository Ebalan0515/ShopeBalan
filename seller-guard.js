import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  if (!user.emailVerified) {
    window.location.href = "verify.html";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const isSeller = snap.exists() && snap.data().isSeller;
    if (!isSeller) {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    // If Firestore isn't reachable, don't strand the user — send them back.
    window.location.href = "dashboard.html";
  }
});
