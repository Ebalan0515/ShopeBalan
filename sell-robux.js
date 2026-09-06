import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

function withTimeout(promise, ms, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms))
  ]);
}

const toast = document.getElementById("toast");
function showToast(text, duration = 2800) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), duration);
}

let currentUser = null;

// ---------- Auth + seller guard ----------
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

  try {
    const snap = await withTimeout(
      getDoc(doc(db, "users", user.uid)),
      12000,
      "Couldn't check your seller status — check your connection and try again."
    );
    const isSeller = snap.exists() && snap.data().isSeller;
    if (!isSeller) {
      window.location.href = "dashboard.html";
      return;
    }
  } catch (err) {
    console.error(err);
    window.location.href = "dashboard.html";
    return;
  }

  loadListings();
});

// ---------- Amount slider sync ----------
const amountInput = document.getElementById("robuxAmount");
const amountSlider = document.getElementById("robuxAmountSlider");

function syncAmount(value) {
  const qty = Math.max(100, Math.min(100000, Number(value) || 100));
  amountInput.value = qty;
  amountSlider.value = qty;
}

amountInput.addEventListener("input", () => syncAmount(amountInput.value));
amountSlider.addEventListener("input", () => syncAmount(amountSlider.value));

// ---------- Create listing ----------
document.getElementById("listNowBtn").addEventListener("click", async () => {
  const errorEl = document.getElementById("listingError");
  const successEl = document.getElementById("listingSuccess");
  errorEl.classList.remove("show");
  successEl.classList.remove("show");

  const amount = Number(amountInput.value);
  const price = Number(document.getElementById("listingPrice").value);
  const deliveryType = document.querySelector('input[name="sellDeliveryType"]:checked').value;
  const notes = document.getElementById("listingNotes").value.trim();

  if (!amount || amount < 100) {
    errorEl.textContent = "Enter a Robux amount of at least 100.";
    errorEl.classList.add("show");
    return;
  }
  if (!price || price <= 0) {
    errorEl.textContent = "Enter a valid asking price.";
    errorEl.classList.add("show");
    return;
  }

  const btn = document.getElementById("listNowBtn");
  btn.disabled = true;
  btn.textContent = "Listing...";

  try {
    await withTimeout(
      addDoc(collection(db, "listings"), {
        sellerId: currentUser.uid,
        sellerName: currentUser.displayName || "Seller",
        type: "robux",
        amount,
        price,
        deliveryType,
        notes,
        status: "active",
        createdAt: serverTimestamp()
      }),
      12000,
      "Listing timed out. Check your Firestore setup and connection."
    );

    successEl.textContent = "Your listing is live.";
    successEl.classList.add("show");
    document.getElementById("listingNotes").value = "";
    loadListings();
  } catch (err) {
    console.error("Create listing failed:", err);
    errorEl.textContent = err.code === "permission-denied"
      ? "Listing blocked by Firestore security rules. See the README for the rules to add."
      : (err.message || "Couldn't create your listing. Please try again.");
    errorEl.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "List for sale";
  }
});

// ---------- Load + render listings ----------
async function loadListings() {
  const container = document.getElementById("listingsContainer");
  const badge = document.getElementById("activeCountBadge");

  try {
    const q = query(
      collection(db, "listings"),
      where("sellerId", "==", currentUser.uid),
      where("type", "==", "robux"),
      where("status", "==", "active")
    );
    const snap = await withTimeout(getDocs(q), 12000, "Couldn't load your listings — check your connection.");

    if (snap.empty) {
      container.innerHTML = `<p class="empty-state">You haven't listed any Robux yet — use the form to create your first listing.</p>`;
      badge.textContent = "0 active listings";
      return;
    }

    badge.textContent = `${snap.size} active listing${snap.size === 1 ? "" : "s"}`;

    container.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "listing-card";
      card.innerHTML = `
        <div class="listing-info">
          <span class="listing-amount">${data.amount.toLocaleString()} Robux — ₱${Number(data.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          <span class="listing-meta">${data.deliveryType === "store" ? "Official store delivery" : "Game Pass delivery"}${data.notes ? " · " + escapeHtml(data.notes) : ""}</span>
        </div>
        <button type="button" class="listing-remove-btn" data-id="${docSnap.id}">Remove</button>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll(".listing-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => removeListing(btn.dataset.id));
    });
  } catch (err) {
    console.error("Load listings failed:", err);
    container.innerHTML = `<p class="empty-state">Couldn't load your listings. ${err.message || ""}</p>`;
  }
}

async function removeListing(id) {
  try {
    await withTimeout(
      deleteDoc(doc(db, "listings", id)),
      12000,
      "Removing the listing timed out. Please try again."
    );
    showToast("Listing removed.");
    loadListings();
  } catch (err) {
    console.error("Remove listing failed:", err);
    showToast(err.message || "Couldn't remove the listing.");
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
