import { state } from "./state.js?v=20260529viewonly";
import { loadData } from "./table.js?v=20260529viewonly";

export function switchMainTab(line, el) {
    state.currentLine = line;
    state.currentCategory = "ALL";
    document.getElementById('line-title').innerText = `${line} PRODUCTIVITY REPORT`;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    loadData();
}

// Category tabs were removed. This function stays only for backward compatibility.
export function switchSubTab() {
    state.currentCategory = "ALL";
    loadData();
}

window.switchMainTab = switchMainTab;
window.switchSubTab = switchSubTab;
