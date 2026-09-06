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
function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let currentUser = null;

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

document.getElementById("listNowBtn").addEventListener("click", async () => {
  const errorEl = document.getElementById("listingError");
  const successEl = document.getElementById("listingSuccess");
  errorEl.classList.remove("show");
  successEl.classList.remove("show");

  const itemName = document.getElementById("itemName").value.trim();
  const price = Number(document.getElementById("itemPrice").value);
  const itemDetails = document.getElementById("itemDetails").value.trim();

  if (!itemName) {
    errorEl.textContent = "Enter the item's name.";
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
        type: "item",
        itemName,
        price,
        itemDetails,
        status: "active",
        createdAt: serverTimestamp()
      }),
      12000,
      "Listing timed out. Check your Firestore setup and connection."
    );

    successEl.textContent = "Your item is listed.";
    successEl.classList.add("show");
    document.getElementById("itemName").value = "";
    document.getElementById("itemPrice").value = "";
    document.getElementById("itemDetails").value = "";
    loadListings();
  } catch (err) {
    console.error("Create item listing failed:", err);
    errorEl.textContent = err.code === "permission-denied"
      ? "Listing blocked by Firestore security rules. See the README for the rules to add."
      : (err.message || "Couldn't create your listing. Please try again.");
    errorEl.classList.add("show");
  } finally {
    btn.disabled = false;
    btn.textContent = "List for sale";
  }
});

async function loadListings() {
  const container = document.getElementById("listingsContainer");
  const badge = document.getElementById("activeCountBadge");

  try {
    const q = query(
      collection(db, "listings"),
      where("sellerId", "==", currentUser.uid),
      where("type", "==", "item"),
      where("status", "==", "active")
    );
    const snap = await withTimeout(getDocs(q), 12000, "Couldn't load your listings — check your connection.");

    if (snap.empty) {
      container.innerHTML = `<p class="empty-state">You haven't listed any items yet.</p>`;
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
          <span class="listing-amount">${escapeHtml(data.itemName)} — ₱${Number(data.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          <span class="listing-meta">${escapeHtml(data.itemDetails || "")}</span>
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
    container.innerHTML = `<p class="empty-state">Couldn't load your listings. ${escapeHtml(err.message || "")}</p>`;
  }
}

async function removeListing(id) {
  try {
    await withTimeout(deleteDoc(doc(db, "listings", id)), 12000, "Removing the listing timed out.");
    showToast("Listing removed.");
    loadListings();
  } catch (err) {
    console.error("Remove listing failed:", err);
    showToast(err.message || "Couldn't remove the listing.");
  }
}
