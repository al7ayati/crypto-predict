// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDNne7sXOwLs0_eBRZeWs_hq_D9cOGI-jA",
  authDomain: "crypto-predict-app.firebaseapp.com",
  projectId: "crypto-predict-app",
  storageBucket: "crypto-predict-app.firebasestorage.app",
  messagingSenderId: "225215610280",
  appId: "1:225215610280:web:3cb2046a55041520b0319d",
  measurementId: "G-CT6NG0XLPY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);