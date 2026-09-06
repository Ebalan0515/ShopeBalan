import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const form = document.getElementById("registerForm");
const submitBtn = document.getElementById("submitBtn");
const googleBtn = document.getElementById("googleBtn");
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
    case "auth/email-already-in-use":
      return "An account already exists with this email. Try logging in instead.";
    case "auth/invalid-email":
      return "That email address isn't valid.";
    case "auth/weak-password":
      return "That password is too weak. Use at least 6 characters.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before finishing.";
    default:
      return "Something went wrong. Please try again.";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.classList.remove("show");
  successMsg.classList.remove("show");

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating your account...";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    await sendEmailVerification(cred.user);

    showSuccess("Your account has been created! Redirecting you to verification...");
    setTimeout(() => {
      window.location.href = "verify.html";
    }, 1200);
  } catch (err) {
    showError(friendlyError(err.code));
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
});

googleBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  googleBtn.disabled = true;

  try {
    await signInWithPopup(auth, provider);
    // Google accounts come pre-verified — straight to dashboard.
    window.location.href = "dashboard.html";
  } catch (err) {
    showError(friendlyError(err.code));
    googleBtn.disabled = false;
  }
});
