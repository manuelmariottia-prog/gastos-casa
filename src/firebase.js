import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDmqasZyCwJEB6FH9ZkBHqSBzVOnOoVlOY",
  authDomain: "gastos-casa-3aa42.firebaseapp.com",
  projectId: "gastos-casa-3aa42",
  storageBucket: "gastos-casa-3aa42.firebasestorage.app",
  messagingSenderId: "5084790984",
  appId: "1:5084790984:web:e6ccec6c6a7c11d65b25fd",
  measurementId: "G-DX6HPQLSXE"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);