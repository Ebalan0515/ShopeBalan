import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  reload
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const verifyText = document.getElementById("verifyText");
const checkBtn = document.getElementById("checkBtn");
const resendBtn = document.getElementById("resendBtn");
const logoutLink = document.getElementById("logoutLink");
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");

function showError(text) {
  successMsg.classList.remove("show");
  errorMsg.textContent = text;
  errorMsg.classList.add("show");
}

function showSuccess(text) {
  errorMsg.classList.remove("show");
  successMsg.textContent = text;
  successMsg.classList.add("show");
}

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  if (user.emailVerified) {
    window.location.href = "dashboard.html";
    return;
  }

  verifyText.textContent = `We sent a verification link to ${user.email}. Click the link, then press "I've verified it, continue" below.`;
});

checkBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  checkBtn.disabled = true;
  checkBtn.textContent = "Checking...";

  try {
    await reload(currentUser);
    if (currentUser.emailVerified) {
      window.location.href = "dashboard.html";
    } else {
      showError("Not verified yet. Make sure you clicked the link in your inbox.");
      checkBtn.disabled = false;
      checkBtn.textContent = "I've verified it, continue";
    }
  } catch (err) {
    showError("Something went wrong. Please try again.");
    checkBtn.disabled = false;
    checkBtn.textContent = "I've verified it, continue";
  }
});

resendBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  resendBtn.disabled = true;

  try {
    await sendEmailVerification(currentUser);
    showSuccess("Verification email resent.");
  } catch (err) {
    showError("Couldn't send the email right now. Please wait a moment before trying again.");
  } finally {
    resendBtn.disabled = false;
  }
});

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await signOut(auth);
  window.location.href = "login.html";
});
