import { state } from "./state.js?v=20260524hoverfixed";
import { loadData } from "./table.js?v=20260524hoverfixed";

export function switchMainTab(line, el) {
    state.currentLine = line;
    document.getElementById('line-title').innerText = `${line} PRODUCTIVITY REPORT`;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    loadData();
}

export function switchSubTab(cat) {
    state.currentCategory = cat;

    document.getElementById('sub-all').className = 'btn-sub';
    document.getElementById('sub-dmg').className = 'btn-sub';
    document.getElementById('sub-av').className = 'btn-sub';

    if (cat === 'ALL') document.getElementById('sub-all').classList.add('active-av');
    if (cat === 'Damage') document.getElementById('sub-dmg').classList.add('active-dmg');
    if (cat === 'Available') document.getElementById('sub-av').classList.add('active-av');

    loadData();
}

window.switchMainTab = switchMainTab;
window.switchSubTab = switchSubTab;
