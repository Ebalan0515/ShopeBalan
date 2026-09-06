# ShopEbalan — Login + Marketplace Dashboard

Firebase-powered auth and marketplace with:
- Email + password login/signup
- **Email verification** (required before reaching the dashboard)
- Google Sign-In
- "Forgot password" reset link
- Protected dashboard page (auto-redirects if not logged in)
- Profile photo upload (Firebase Storage)
- Editable display name, password, address & contact number
- Seller mode — list Robux, Roblox accounts, or items for sale
- Buy Robux / Roblox Accounts / Items pages that show real listings from sellers

## Files

| File | Purpose |
|---|---|
| `firebase-config.js` | Firebase init (Auth, Firestore, Storage) — used by every page |
| `style.css` | Shared design system |
| `index.html` | Entry point — auto-redirects based on login status |
| `register.html` / `register.js` | Sign-up page |
| `login.html` / `login.js` | Login page |
| `verify.html` / `verify.js` | Email verification waiting page |
| `dashboard.html` / `dashboard.js` | Marketplace dashboard shown after login — switches between "buy" and "sell" views |
| `buy-robux.html` / `buy-robux.js` | Browse active Robux listings from sellers |
| `roblox-accounts.html` / `roblox-accounts.js` | Pick a game, browse account listings for it |
| `roblox-items.html` / `roblox-items.js` | Browse active item listings, searchable by name |
| `sell-robux.html` / `sell-robux.js` | List your own Robux for sale; view/remove your listings |
| `sell-accounts.html` / `sell-accounts.js` | List a Roblox account for sale (game, price, details, credentials) |
| `sell-items.html` / `sell-items.js` | List an item for sale (name, price, details) |
| `tiles.js` | Shared helper that generates original category icons (no copyrighted game art), plus the shared `ROBLOX_GAMES` list used by both the sell and browse account pages |

## Before you publish — Firebase Console setup

1. **Enable sign-in methods**
   [Firebase Console](https://console.firebase.google.com/) → project **myshopebalan** → **Authentication** → **Sign-in method** tab → enable:
   - **Email/Password**
   - **Google**

2. **Enable Cloud Firestore** and set these rules under **Rules**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /listings/{listingId} {
         allow read: if request.auth != null;
         allow create: if request.auth != null && request.resource.data.sellerId == request.auth.uid;
         allow update, delete: if request.auth != null && resource.data.sellerId == request.auth.uid;

         match /private/{docId} {
           allow create: if request.auth != null && request.resource.data.sellerId == request.auth.uid;
           allow read, update, delete: if request.auth != null && resource.data.sellerId == request.auth.uid;
         }
       }
     }
   }
   ```
   The `listings/{id}/private/credentials` subcollection is where a Roblox account listing's username and password are stored. The rule above means **only the seller who created that listing can ever read it** — not other logged-in users, and not even a buyer, since there's no purchase-confirmation step yet to grant them access. See the security note at the bottom of this file before treating that as production-ready.

   **Important:** if you already set up Firestore rules before this update, go back to **Rules** and replace them with the version above — without the `private` block, creating an account listing will fail on the credentials step.

3. **Enable Firebase Storage** (used for profile photo uploads — requires the Blaze billing plan; Storage no longer works on the free Spark plan)
   Go to **Build → Storage → Get started**. Then under **Rules**, restrict uploads to each user's own avatar path:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /avatars/{userId} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == userId
                       && request.resource.size < 5 * 1024 * 1024;
       }
     }
   }
   ```

4. **Add your production domain to Authorized domains**
   **Authentication → Settings → Authorized domains** → add the domain you're publishing to. Without this, Google sign-in won't work once live.

5. **Customize the verification email** (optional but recommended)
   **Authentication → Templates → Email address verification**.

## Publishing from VS Code

1. Drop all these files into one project folder (same level, no subfolders).
2. Use the **Live Server** extension in VS Code to test locally (needs http/https — opening the file directly won't work because of `type="module"` scripts).
3. Deploy with **Firebase Hosting** (`firebase init hosting` → `firebase deploy`), or any static host — as long as the domain is in Authorized domains (step 4 above).

## Login flow

```
register.html → (send verification email) → verify.html
                                                  │
                                    (clicks the link in their email)
                                                  ▼
login.html ──(verified user)──────────────► dashboard.html
   │
   └──(not verified yet)────────────────► verify.html

Google sign-in → dashboard.html (auto-verified, no extra step)
```

## The `listings` collection

Every Buy/Sell page reads from and writes to one Firestore collection, `listings`. Common fields on every document: `sellerId`, `sellerName`, `type` (`"robux"` | `"account"` | `"item"`), `price`, `status` (`"active"` — removing a listing deletes the doc rather than changing this, but the field is there if you want soft-deletes later), `createdAt`.

Type-specific fields:
- **robux**: `amount`, `deliveryType` (`"gamepass"` | `"store"`), `notes`
- **account**: `gameTitle`, `accountDetails` — the username/password live separately in `listings/{id}/private/credentials`, never in this document
- **item**: `itemName`, `itemDetails`

## Dashboard features

- **Avatar** — click the circle to upload a profile photo (Firebase Storage).
- **Hamburger menu (top right)** →
  - **Account settings** — display name and password (password only for email/password accounts).
  - **Address & contact** — saved to Firestore, editable anytime.
  - **Switch to seller mode** — requires an address and contact number to already be saved; the modal links straight to that form if either is missing. Once on, the dashboard's "Top Offers" switches to a "Start Selling" view linking to the three sell-*.html pages.
- **Buy now buttons** (on Buy Robux / Accounts / Items) — currently show a "coming soon" toast. No payment processing is wired up; that needs a separate integration (PayMongo, Stripe, GCash API, etc.) before these can take real orders or actually connect a buyer to a seller.

## Security note on account credentials — read before handling real transactions

Sell Accounts stores a listing's Roblox username and password in Firestore, in a subdocument only the seller can read (see the rules above). That keeps it hidden from other users browsing the marketplace, which is what was asked for. But a few things are still missing before this should handle real accounts or real money:

- **No reveal-after-purchase flow.** Since there's no payment gateway connected yet, there's also no mechanism to grant a buyer access to credentials once they've paid — that requires server-side logic (a Cloud Function, typically) to verify payment and then update security rules or copy the data somewhere the buyer can reach. Right now, credentials are only ever visible to the original seller.
- **Plaintext storage.** Passwords are stored as-is, not encrypted. For a real marketplace, you'd want to encrypt these at rest (e.g. via a Cloud Function using a server-side key) rather than relying on Firestore rules alone as the only protection.
- **No escrow or dispute handling.** A real accounts marketplace usually needs a way to hold payment until the buyer confirms the account works, and a process for disputes. None of that exists here yet.

This implementation is a solid starting point for the UI and data model, but treat it as a prototype until those three points are addressed — ideally with input from someone experienced in handling credentials and payments securely.
