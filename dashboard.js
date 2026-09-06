import { auth, db, storage } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

// ---------- Elements ----------
const avatarBtn = document.getElementById("avatarBtn");
const avatarInput = document.getElementById("avatarInput");
const avatarImg = document.getElementById("avatarImg");
const avatarInitial = document.getElementById("avatarInitial");
const usernamePill = document.getElementById("usernamePill");

const hamburgerBtn = document.getElementById("hamburgerBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const logoutBtn = document.getElementById("logoutBtn");

const openAccountSettings = document.getElementById("openAccountSettings");
const openAddress = document.getElementById("openAddress");
const openSellerMode = document.getElementById("openSellerMode");

const offersTitle = document.getElementById("offersTitle");
const offersGrid = document.getElementById("offersGrid");

const toast = document.getElementById("toast");

let currentUser = null;
let isEmailPasswordAccount = false;

// Profile state kept in memory so the seller-mode gate and the
// buy/sell view swap don't need to re-read Firestore every time.
let profileState = { address: "", contactNumber: "", isSeller: false };

// ---------- Toast ----------
function showToast(text, duration = 2800) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), duration);
}

// Wraps a Firebase promise so it never hangs the UI forever. If Firestore/Storage
// aren't enabled yet, or the connection can't reach Firebase, requests can sit
// pending with no error — this forces a clear failure after `ms` instead.
function withTimeout(promise, ms, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms))
  ]);
}

// ---------- Modal helpers ----------
function openModal(id) {
  document.getElementById(id).classList.add("show");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("show");
  });
});

// ---------- Dropdown menu ----------
hamburgerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("show");
});
document.addEventListener("click", (e) => {
  if (!dropdownMenu.contains(e.target) && e.target !== hamburgerBtn) {
    dropdownMenu.classList.remove("show");
  }
});

// ---------- Auth guard ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  if (!user.emailVerified) {
    window.location.href = "verify.html";
    return;
  }

  currentUser = user;
  isEmailPasswordAccount = user.providerData[0]?.providerId === "password";
  document.getElementById("passwordForm").style.display = isEmailPasswordAccount ? "block" : "none";

  const name = user.displayName || "Shop owner";
  usernamePill.textContent = name;
  document.getElementById("displayNameInput").value = user.displayName || "";

  if (user.photoURL) {
    avatarImg.src = user.photoURL;
    avatarImg.style.display = "block";
    avatarInitial.style.display = "none";
  } else {
    avatarInitial.textContent = name.charAt(0).toUpperCase();
  }

  await loadUserDoc(user.uid);
});

async function loadUserDoc(uid) {
  try {
    const snap = await withTimeout(
      getDoc(doc(db, "users", uid)),
      12000,
      "Loading your profile timed out — check your Firebase Firestore setup."
    );
    if (snap.exists()) {
      const data = snap.data();
      profileState.address = data.address || "";
      profileState.contactNumber = data.contactNumber || "";
      profileState.isSeller = !!data.isSeller;
    } else {
      profileState = { address: "", contactNumber: "", isSeller: false };
    }

    document.getElementById("contactNumberInput").value = profileState.contactNumber;
    document.getElementById("addressInput").value = profileState.address;

    setSellerUI(profileState.isSeller);
    renderOffers(profileState.isSeller);
  } catch (err) {
    // Firestore might not be enabled yet, or the request timed out — the
    // dashboard still works, forms just start out empty until it's fixed.
    console.warn("Could not load profile data:", err.message);
    renderOffers(false);
  }
}

function hasSellerRequirements() {
  return profileState.address.trim() !== "" && profileState.contactNumber.trim() !== "";
}

function setSellerUI(isSeller) {
  const toggleBtn = document.getElementById("toggleSellerBtn");
  const comingSoon = document.getElementById("sellerComingSoon");
  const sellerText = document.getElementById("sellerText");
  const requirementBox = document.getElementById("sellerRequirement");

  if (isSeller) {
    toggleBtn.textContent = "Turn off seller mode";
    sellerText.style.display = "none";
    comingSoon.style.display = "block";
    requirementBox.style.display = "none";
    toggleBtn.disabled = false;
  } else {
    toggleBtn.textContent = "Turn on seller mode";
    sellerText.style.display = "block";
    comingSoon.style.display = "none";

    const meetsRequirements = hasSellerRequirements();
    requirementBox.style.display = meetsRequirements ? "none" : "block";
    toggleBtn.disabled = !meetsRequirements;
  }
  toggleBtn.dataset.active = isSeller ? "true" : "false";
}

// ---------- Buy / Sell dashboard view ----------
function renderOffers(isSeller) {
  if (isSeller) {
    offersTitle.textContent = "Start Selling";
    offersGrid.innerHTML = `
      <a href="sell-robux.html" class="offer-card sell-variant">
        <div class="offer-icon offer-icon-amber">
          <svg viewBox="0 0 48 48" fill="none"><path d="M24 4 L42 16 L36 40 H12 L6 16 Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 4 L24 40 M6 16 H42 M14 16 L24 4 L34 16 M14 16 L20 40 M34 16 L28 40" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity="0.55"/></svg>
        </div>
        <h3 class="offer-name">Sell Robux</h3>
        <ul class="offer-features">
          <li>Set your own rate</li>
          <li>Choose your delivery method</li>
          <li>Get matched with buyers</li>
        </ul>
        <div class="offer-footer">
          <span class="offer-price">List now</span>
        </div>
      </a>

      <a href="sell-accounts.html" class="offer-card sell-variant">
        <div class="offer-icon offer-icon-teal">
          <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="16" r="8" stroke="currentColor" stroke-width="2.5"/><path d="M8 42c0-9 7-15 16-15s16 6 16 15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M18 16a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="1.4" opacity="0.5"/></svg>
        </div>
        <h3 class="offer-name">Sell Roblox Accounts</h3>
        <ul class="offer-features">
          <li>List by experience</li>
          <li>Set your asking price</li>
          <li>Reach ready buyers</li>
        </ul>
        <div class="offer-footer">
          <span class="offer-price">List now</span>
        </div>
      </a>

      <a href="sell-items.html" class="offer-card sell-variant">
        <div class="offer-icon offer-icon-purple">
          <svg viewBox="0 0 48 48" fill="none"><rect x="7" y="18" width="34" height="22" rx="2" stroke="currentColor" stroke-width="2.5"/><path d="M7 26h34" stroke="currentColor" stroke-width="2.5"/><path d="M24 18v22" stroke="currentColor" stroke-width="1.4" opacity="0.55"/><path d="M17 18c0-4 3-8 7-8s7 4 7 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </div>
        <h3 class="offer-name">Sell Items</h3>
        <ul class="offer-features">
          <li>List items, currency, or boosts</li>
          <li>Set your own prices</li>
          <li>Fast payouts</li>
        </ul>
        <div class="offer-footer">
          <span class="offer-price">List now</span>
        </div>
      </a>
    `;
  } else {
    offersTitle.textContent = "Top Offers";
    offersGrid.innerHTML = `
      <a href="buy-robux.html" class="offer-card">
        <div class="offer-icon offer-icon-amber">
          <svg viewBox="0 0 48 48" fill="none"><path d="M24 4 L42 16 L36 40 H12 L6 16 Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 4 L24 40 M6 16 H42 M14 16 L24 4 L34 16 M14 16 L20 40 M34 16 L28 40" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" opacity="0.55"/></svg>
        </div>
        <h3 class="offer-name">Buy Robux</h3>
        <ul class="offer-features">
          <li>Any amount</li>
          <li>Complete safety</li>
          <li>Quick delivery</li>
        </ul>
        <div class="offer-footer">
          <span class="offer-price">From ₱250<sup>.00</sup></span>
        </div>
      </a>

      <a href="roblox-accounts.html" class="offer-card">
        <div class="offer-icon offer-icon-teal">
          <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="16" r="8" stroke="currentColor" stroke-width="2.5"/><path d="M8 42c0-9 7-15 16-15s16 6 16 15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M18 16a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="1.4" opacity="0.5"/></svg>
        </div>
        <h3 class="offer-name">Roblox Accounts</h3>
        <ul class="offer-features">
          <li>Ready-to-play accounts</li>
          <li>Low prices</li>
          <li>Reputable sellers</li>
        </ul>
        <div class="offer-footer">
          <span class="offer-price">From ₱45<sup>.00</sup></span>
        </div>
      </a>

      <a href="roblox-items.html" class="offer-card">
        <div class="offer-icon offer-icon-purple">
          <svg viewBox="0 0 48 48" fill="none"><rect x="7" y="18" width="34" height="22" rx="2" stroke="currentColor" stroke-width="2.5"/><path d="M7 26h34" stroke="currentColor" stroke-width="2.5"/><path d="M24 18v22" stroke="currentColor" stroke-width="1.4" opacity="0.55"/><path d="M17 18c0-4 3-8 7-8s7 4 7 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </div>
        <h3 class="offer-name">Items</h3>
        <ul class="offer-features">
          <li>Items for sale</li>
          <li>Best prices</li>
          <li>Fast delivery</li>
        </ul>
        <div class="offer-footer">
          <span class="offer-price">From ₱45<sup>.00</sup></span>
        </div>
      </a>
    `;
  }
}

// ---------- Avatar upload ----------
avatarBtn.addEventListener("click", () => avatarInput.click());

avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files[0];
  if (!file || !currentUser) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please choose an image file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast("That image is too large — please use one under 5MB.");
    return;
  }

  showToast("Uploading photo...", 15000);

  try {
    const storageRef = ref(storage, `avatars/${currentUser.uid}`);
    await withTimeout(
      uploadBytes(storageRef, file),
      12000,
      "Upload timed out. Check that Firebase Storage is enabled for this project, and that your internet can reach Firebase."
    );
    const url = await withTimeout(
      getDownloadURL(storageRef),
      12000,
      "Couldn't fetch the uploaded photo's URL. Check your Storage security rules."
    );
    await updateProfile(currentUser, { photoURL: url });

    avatarImg.src = url;
    avatarImg.style.display = "block";
    avatarInitial.style.display = "none";
    showToast("Profile photo updated.");
  } catch (err) {
    console.error("Avatar upload failed:", err);
    if (err.code === "storage/unauthorized") {
      showToast("Upload blocked by Storage security rules. See the README for the rules to add.", 6000);
    } else if (err.code === "storage/unknown" || err.message?.includes("CORS")) {
      showToast("Upload failed — Firebase Storage may not be enabled yet for this project.", 6000);
    } else {
      showToast(err.message || "Couldn't upload photo. Please try again.", 6000);
    }
  } finally {
    avatarInput.value = "";
  }
});

// ---------- Menu -> modals ----------
openAccountSettings.addEventListener("click", () => {
  dropdownMenu.classList.remove("show");
  openModal("accountModal");
});
openAddress.addEventListener("click", () => {
  dropdownMenu.classList.remove("show");
  openModal("addressModal");
});
openSellerMode.addEventListener("click", () => {
  dropdownMenu.classList.remove("show");
  setSellerUI(profileState.isSeller); // refresh requirement check with latest state
  openModal("sellerModal");
});

document.getElementById("goToAddressBtn").addEventListener("click", () => {
  closeModal("sellerModal");
  openModal("addressModal");
});

// ---------- Display name form ----------
document.getElementById("displayNameForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("accountError");
  const successEl = document.getElementById("accountSuccess");
  errorEl.classList.remove("show");
  successEl.classList.remove("show");

  const newName = document.getElementById("displayNameInput").value.trim();
  const btn = document.getElementById("saveNameBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    await updateProfile(currentUser, { displayName: newName });
    usernamePill.textContent = newName;
    successEl.textContent = "Display name updated.";
    successEl.classList.add("show");
  } catch (err) {
    errorEl.textContent = "Couldn't update your name. Please try again.";
    errorEl.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save name";
  }
});

// ---------- Password form ----------
document.getElementById("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("accountError");
  const successEl = document.getElementById("accountSuccess");
  errorEl.classList.remove("show");
  successEl.classList.remove("show");

  const currentPassword = document.getElementById("currentPasswordInput").value;
  const newPassword = document.getElementById("newPasswordInput").value;
  const btn = document.getElementById("savePasswordBtn");
  btn.disabled = true;
  btn.textContent = "Updating...";

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
    successEl.textContent = "Password updated.";
    successEl.classList.add("show");
    e.target.reset();
  } catch (err) {
    errorEl.textContent = err.code === "auth/invalid-credential"
      ? "Your current password is incorrect."
      : "Couldn't update your password. Please try again.";
    errorEl.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "Update password";
  }
});

// ---------- Address form ----------
document.getElementById("addressForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("addressError");
  const successEl = document.getElementById("addressSuccess");
  errorEl.classList.remove("show");
  successEl.classList.remove("show");

  const contactNumber = document.getElementById("contactNumberInput").value.trim();
  const address = document.getElementById("addressInput").value.trim();
  const btn = document.getElementById("saveAddressBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    await withTimeout(
      setDoc(doc(db, "users", currentUser.uid), { contactNumber, address }, { merge: true }),
      12000,
      "Saving timed out. Check that Cloud Firestore is enabled for this project, and that your internet can reach Firebase."
    );
    profileState.contactNumber = contactNumber;
    profileState.address = address;
    successEl.textContent = "Address and contact info saved.";
    successEl.classList.add("show");
    setSellerUI(profileState.isSeller); // requirement box may now clear
  } catch (err) {
    console.error("Saving address failed:", err);
    if (err.code === "permission-denied") {
      errorEl.textContent = "Save blocked by Firestore security rules. See the README for the rules to add.";
    } else if (err.code === "unavailable" || err.message?.includes("timed out")) {
      errorEl.textContent = err.message;
    } else {
      errorEl.textContent = "Couldn't save your info. Make sure Firestore is enabled.";
    }
    errorEl.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save changes";
  }
});

// ---------- Seller mode toggle ----------
document.getElementById("toggleSellerBtn").addEventListener("click", async (e) => {
  const btn = e.target;
  const nextState = btn.dataset.active !== "true";

  if (nextState && !hasSellerRequirements()) {
    // Guarded by disabled state already, but double-check in case of stale state.
    setSellerUI(false);
    return;
  }

  btn.disabled = true;

  try {
    await withTimeout(
      setDoc(doc(db, "users", currentUser.uid), { isSeller: nextState }, { merge: true }),
      12000,
      "Saving timed out. Check that Cloud Firestore is enabled for this project."
    );
    profileState.isSeller = nextState;
    setSellerUI(nextState);
    renderOffers(nextState);
    showToast(nextState ? "Seller mode turned on." : "Seller mode turned off.");
  } catch (err) {
    console.error("Toggling seller mode failed:", err);
    document.getElementById("sellerError").textContent = err.message || "Couldn't update seller mode. Make sure Firestore is enabled.";
    document.getElementById("sellerError").classList.add("show");
  } finally {
    btn.disabled = false;
  }
});

// ---------- Logout ----------
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});