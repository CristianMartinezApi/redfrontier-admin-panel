import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDoT5ae78KgV0c6zJJzfddzoP9HWsiLP-o",
  authDomain: "redfrontier-98f93.firebaseapp.com",
  projectId: "redfrontier-98f93",
  storageBucket: "redfrontier-98f93.firebasestorage.app",
  messagingSenderId: "753210933783",
  appId: "1:753210933783:web:5494de49794e10a482d252",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
