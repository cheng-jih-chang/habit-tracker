// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOUC5FD4T3dc4GTUc5g9RixBPoUE2JG1E",
  authDomain: "sunny-habit-app.firebaseapp.com",
  projectId: "sunny-habit-app",
  storageBucket: "sunny-habit-app.firebasestorage.app",
  messagingSenderId: "23720228981",
  appId: "1:23720228981:web:8522ede78f4d959bd4e03c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
