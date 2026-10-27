import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDNne7sXOwLs0_eBRZeWs_hq_D9cOGI-jA",
  authDomain: "crypto-predict-app.firebaseapp.com",
  projectId: "crypto-predict-app",
  storageBucket: "crypto-predict-app.firebasestorage.app",
  messagingSenderId: "225215610280",
  appId: "1:225215610280:web:3cb2046a55041520b0319d",
  measurementId: "G-CT6NG0XLPY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
