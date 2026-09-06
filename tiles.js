// tiles.js
// Renders category tiles with generated abstract icons — no copyrighted
// game logos or artwork, just a colored gradient + initials per name.

// Shared game list so the Sell Account form and the Roblox Accounts browse
// page always offer the exact same set of names (no typo mismatches).
export const ROBLOX_GAMES = [
  "Steal a Brainrot",
  "Adopt Me",
  "Anime Vanguards",
  "Bee Swarm",
  "Blade Ball",
  "Blox Fruits",
  "Escape Tsunami",
  "Fisch",
  "Fish It",
  "Grow a Garden",
  "Grow a Garden 2",
  "King Legacy",
  "Murder Mystery 2",
  "Roblox Rivals",
  "Sailor Piece",
  "The Forge",
  "99 Nights in the Forest"
];

function hashHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function initials(name) {
  const words = name.split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function renderCategoryGrid(container, categories, activeName, onSelect) {
  container.innerHTML = "";

  categories.forEach((name) => {
    const hue = hashHue(name);
    const isActive = name === activeName;

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile" + (isActive ? " active" : "");
    tile.dataset.name = name.toLowerCase();

    if (isActive) {
      tile.style.background = "linear-gradient(160deg, #6C5CE7, #4834b0)";
    } else {
      tile.style.background = `linear-gradient(160deg, hsl(${hue}, 55%, 32%), hsl(${(hue + 40) % 360}, 55%, 16%))`;
    }

    tile.innerHTML = `
      <span class="tile-glyph">${initials(name)}</span>
      <span class="tile-label">${name}</span>
    `;

    tile.addEventListener("click", () => {
      container.querySelectorAll(".tile").forEach((t) => {
        t.classList.remove("active");
        const h = hashHue(t.dataset.name);
        t.style.background = `linear-gradient(160deg, hsl(${h}, 55%, 32%), hsl(${(h + 40) % 360}, 55%, 16%))`;
      });
      tile.classList.add("active");
      tile.style.background = "linear-gradient(160deg, #6C5CE7, #4834b0)";
      if (onSelect) onSelect(name);
    });

    container.appendChild(tile);
  });
}

export function setupSearch(input, container) {
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    container.querySelectorAll(".tile").forEach((tile) => {
      const match = tile.dataset.name.includes(query);
      tile.style.display = match ? "flex" : "none";
    });
  });
}

export function setupFilterDropdowns() {
  document.querySelectorAll(".filter-dropdown").forEach((dropdown) => {
    const btn = dropdown.querySelector(".filter-btn");
    const panel = dropdown.querySelector(".filter-panel");
    const label = dropdown.querySelector(".filter-btn-label");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".filter-panel").forEach((p) => {
        if (p !== panel) p.classList.remove("show");
      });
      panel.classList.toggle("show");
    });

    panel.querySelectorAll("button").forEach((option) => {
      option.addEventListener("click", () => {
        label.textContent = option.textContent;
        panel.classList.remove("show");
      });
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".filter-panel").forEach((p) => p.classList.remove("show"));
  });
}
