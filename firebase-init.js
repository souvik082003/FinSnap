
// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBku87DhhnViSDHlv8bZRUyI4FiJeN7BVg",
  authDomain: "finsnap-ss021.firebaseapp.com",
  projectId: "finsnap-ss021",
  storageBucket: "finsnap-ss021.firebasestorage.app",
  messagingSenderId: "592015917172",
  appId: "1:592015917172:web:b4cc6cadca54a637611121"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Save user data to Firestore + localStorage
export async function saveUserData(email, data) {
  await setDoc(doc(db, "users", email), data);
  localStorage.setItem(`user_${email}`, JSON.stringify(data));
}

// Load user data from Firestore (with localStorage fallback)
export async function loadUserData(email) {
  try {
    const docSnap = await getDoc(doc(db, "users", email));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      localStorage.setItem(`user_${email}`, JSON.stringify(userData));
      return userData;
    }
  } catch (err) {
    console.warn("Firestore load failed, using localStorage:", err);
  }
  return JSON.parse(localStorage.getItem(`user_${email}`)) || null;
}
