import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else if (!user.emailVerified) {
    window.location.href = "verify.html";
  }
});

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

const listingsResults = document.getElementById("listingsResults");

async function loadListings() {
  listingsResults.innerHTML = `<p class="empty-state">Loading listings...</p>`;

  try {
    const q = query(collection(db, "listings"), where("type", "==", "robux"), where("status", "==", "active"));
    const snap = await withTimeout(getDocs(q), 12000, "Loading listings timed out.");

    if (snap.empty) {
      listingsResults.innerHTML = `<p class="empty-state">No Robux listings yet — check back soon, or list your own from Seller mode.</p>`;
      return;
    }

    listingsResults.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const deliveryLabel = data.deliveryType === "store" ? "Official store delivery" : "Game Pass delivery";
      const card = document.createElement("div");
      card.className = "listing-buy-card";
      card.innerHTML = `
        <span class="lb-title">${Number(data.amount).toLocaleString()} Robux</span>
        <span class="lb-meta">${deliveryLabel}${data.notes ? " · " + escapeHtml(data.notes) : ""}</span>
        <span class="lb-seller">Sold by ${escapeHtml(data.sellerName || "a seller")}</span>
        <div class="lb-footer">
          <span class="lb-price">₱${Number(data.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          <button type="button" class="btn-buy" data-id="${docSnap.id}">Buy now</button>
        </div>
      `;
      listingsResults.appendChild(card);
    });

    listingsResults.querySelectorAll(".btn-buy").forEach((btn) => {
      btn.addEventListener("click", () => {
        showToast("Thanks for your interest — checkout isn't wired up yet.");
      });
    });
  } catch (err) {
    console.error("Load robux listings failed:", err);
    listingsResults.innerHTML = `<p class="empty-state">Couldn't load listings. ${escapeHtml(err.message || "")}</p>`;
  }
}

loadListings();
