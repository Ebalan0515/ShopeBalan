import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const form = document.getElementById("loginForm");
const submitBtn = document.getElementById("submitBtn");
const googleBtn = document.getElementById("googleBtn");
const forgotLink = document.getElementById("forgotLink");
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

function friendlyError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please try again.";
    case "auth/invalid-email":
      return "That email address isn't valid.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment before trying again.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before finishing.";
    case "auth/missing-email":
      return "Enter your email in the field first to reset your password.";
    default:
      return "Something went wrong. Please try again.";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.classList.remove("show");
  successMsg.classList.remove("show");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    if (!cred.user.emailVerified) {
      window.location.href = "verify.html";
      return;
    }

    window.location.href = "dashboard.html";
  } catch (err) {
    showError(friendlyError(err.code));
    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";
  }
});

googleBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  googleBtn.disabled = true;

  try {
    await signInWithPopup(auth, provider);
    window.location.href = "dashboard.html";
  } catch (err) {
    showError(friendlyError(err.code));
    googleBtn.disabled = false;
  }
});

forgotLink.addEventListener("click", async (e) => {
  e.preventDefault();
  errorMsg.classList.remove("show");
  successMsg.classList.remove("show");

  const email = document.getElementById("email").value.trim();

  if (!email) {
    showError(friendlyError("auth/missing-email"));
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    showSuccess(`We've sent a password reset link to ${email}. Check your inbox.`);
  } catch (err) {
    showError(friendlyError(err.code));
  }
});
