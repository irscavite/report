import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC-xiBCDw_SZz36WrDRKHszl5GhGIidXrY",
    authDomain: "eastern1961-e83f6.firebaseapp.com",
    databaseURL: "https://eastern1961-e83f6-default-rtdb.firebaseio.com",
    projectId: "eastern1961-e83f6",
    storageBucket: "eastern1961-e83f6.firebasestorage.app",
    messagingSenderId: "578815361363",
    appId: "1:578815361363:web:5d4ad5b1c2cdc3631921a6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
