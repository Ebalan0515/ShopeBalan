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
const searchInput = document.getElementById("searchInput");
let allListings = [];

async function loadListings() {
  listingsResults.innerHTML = `<p class="empty-state">Loading listings...</p>`;

  try {
    const q = query(collection(db, "listings"), where("type", "==", "item"), where("status", "==", "active"));
    const snap = await withTimeout(getDocs(q), 12000, "Loading listings timed out.");

    allListings = [];
    snap.forEach((docSnap) => allListings.push({ id: docSnap.id, ...docSnap.data() }));

    renderListings(allListings);
  } catch (err) {
    console.error("Load item listings failed:", err);
    listingsResults.innerHTML = `<p class="empty-state">Couldn't load listings. ${escapeHtml(err.message || "")}</p>`;
  }
}

function renderListings(items) {
  if (items.length === 0) {
    listingsResults.innerHTML = `<p class="empty-state">No items listed yet — check back soon.</p>`;
    return;
  }

  listingsResults.innerHTML = "";
  items.forEach((data) => {
    const card = document.createElement("div");
    card.className = "listing-buy-card";
    card.innerHTML = `
      <span class="lb-title">${escapeHtml(data.itemName)}</span>
      <span class="lb-meta">${escapeHtml(data.itemDetails || "")}</span>
      <span class="lb-seller">Sold by ${escapeHtml(data.sellerName || "a seller")}</span>
      <div class="lb-footer">
        <span class="lb-price">₱${Number(data.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        <button type="button" class="btn-buy" data-id="${data.id}">Buy now</button>
      </div>
    `;
    listingsResults.appendChild(card);
  });

  listingsResults.querySelectorAll(".btn-buy").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast("Thanks for your interest — checkout isn't wired up yet.");
    });
  });
}

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = allListings.filter((item) => item.itemName.toLowerCase().includes(q));
  renderListings(filtered);
});

loadListings();
