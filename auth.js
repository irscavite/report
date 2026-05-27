import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { auth } from "./firebase.js?v=20260527statuscols";
import { userAccessMap } from "./constants.js?v=20260527statuscols";
import { state } from "./state.js?v=20260527statuscols";
import { switchMainTab } from "./tabs.js?v=20260527statuscols";

export function checkLogin() {
    const e = document.getElementById('email-field').value.toLowerCase().trim();
    const p = document.getElementById('password-field').value;

    signInWithEmailAndPassword(auth, e, p).then(() => {
        state.currentUserRole = userAccessMap[e];

        if (!state.currentUserRole) {
            auth.signOut();
            return;
        }

        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-system').style.display = 'block';
        document.getElementById('user-display').innerText = e + (state.currentUserRole === "ADMIN" ? " (MAIN)" : " (VIEWER)");

        if (state.currentUserRole === "ADMIN") {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = "block");
            document.querySelectorAll('.tab').forEach(t => t.style.display = "block");
            document.getElementById('admin-summary-btn').style.display = "block";
            switchMainTab('MAERSK', document.getElementById('tab-MAERSK'));
        } else {
            document.getElementById('admin-summary-btn').style.display = "none";
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = "none");

            const allowedTab = document.getElementById(`tab-${state.currentUserRole}`);

            if (allowedTab) {
                allowedTab.style.display = "block";
                switchMainTab(state.currentUserRole, allowedTab);
            }
        }
    }).catch(() => {
        document.getElementById('error-msg').style.display = 'block';
    });
}

window.checkLogin = checkLogin;
