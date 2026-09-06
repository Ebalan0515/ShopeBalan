import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBphRiV2XVxeG5LFl7Pt32i8qxtoM4fN18",
  authDomain: "myshopebalan.firebaseapp.com",
  projectId: "myshopebalan",
  storageBucket: "myshopebalan.firebasestorage.app",
  messagingSenderId: "226685377295",
  appId: "1:226685377295:web:0e21d457d91b296677bc7a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);