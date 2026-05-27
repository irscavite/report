import { get, ref } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { db } from "./firebase.js?v=20260527statuscols";
import { state } from "./state.js?v=20260527statuscols";

function getStatusText(tr) {
    const cell = tr.cells[5];
    const select = cell?.querySelector?.('.status-select');
    return (select ? select.value : (cell?.innerText || tr.dataset.category || '')).trim();
}

function getDateOutText(tr) {
    return (tr.cells[15]?.innerText || '').trim();
}

function isAvailableInYard(status, dateOut) {
    const cleanStatus = String(status || '').trim().toLowerCase();
    return (cleanStatus === 'available' || cleanStatus === 'avail') && !String(dateOut || '').trim();
}

function normalizeRemarksText(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean || "No Remarks";
}

function updateRemarksSummary(visibleRows) {
    const box = document.getElementById("remarks-summary-list");
    if (!box) return;

    const counts = new Map();
    visibleRows.forEach(tr => {
        const remarks = normalizeRemarksText(tr.cells[18]?.innerText);
        counts.set(remarks, (counts.get(remarks) || 0) + 1);
    });

    const entries = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    if (!entries.length) {
        box.innerHTML = '<span class="remarks-summary-empty">No visible remarks</span>';
        return;
    }

    box.innerHTML = entries.map(([remarks, count]) => `
        <span class="remarks-summary-chip" title="${remarks.replace(/"/g, '&quot;')}">
            <span>${remarks}</span>
            <span class="remarks-summary-count">${count}</span>
        </span>
    `).join("");
}


export async function calculateLineStats() {
    const rows = Array.from(document.querySelectorAll('#table-body tr'));
    const visibleRows = rows.filter(tr => tr.style.display !== 'none' && tr.cells[2].innerText.trim() !== "");
    updateRemarksSummary(visibleRows);

    const filteredTotalEl = document.getElementById('filtered-total-count');
    if (filteredTotalEl) filteredTotalEl.innerText = visibleRows.length;

    let filteredDamage = 0;
    let filteredAvailable = 0;
    visibleRows.forEach(tr => {
        const rowCategory = getStatusText(tr).toLowerCase();
        const dateOut = getDateOutText(tr);
        if (rowCategory === 'damage' || rowCategory === 'dmg') filteredDamage++;
        if (isAvailableInYard(rowCategory, dateOut)) filteredAvailable++;
    });

    const filteredDamagePercent = visibleRows.length > 0 ? ((filteredDamage / visibleRows.length) * 100).toFixed(1) : '0.0';
    const filteredAvailablePercent = visibleRows.length > 0 ? ((filteredAvailable / visibleRows.length) * 100).toFixed(1) : '0.0';

    const filteredDamageEl = document.getElementById('filtered-total-damage');
    if (filteredDamageEl) filteredDamageEl.innerText = `${filteredDamage} (${filteredDamagePercent}%)`;

    const filteredAvailableEl = document.getElementById('filtered-total-available');
    if (filteredAvailableEl) filteredAvailableEl.innerText = `${filteredAvailable} (${filteredAvailablePercent}%)`;

    let app = 0, rep = 0, rApp = 0, rPen = 0;

    visibleRows.forEach(tr => {
        const hasApp = tr.cells[11].innerText.trim() !== "";
        const hasRep = tr.cells[13].innerText.trim() !== "";

        if (hasApp) app++;
        if (hasRep) rep++;
        if (hasApp && !hasRep) rApp++;
        if (!hasApp) rPen++;
    });

    const dmgSnap = await get(ref(db, `${state.currentLine}/Damage`));
    const avSnap = await get(ref(db, `${state.currentLine}/Available`));

    const normalizeList = (value) => Array.isArray(value) ? value : (value && typeof value === 'object' ? Object.values(value) : []);
    const dmgList = normalizeList(dmgSnap.val()).filter(i => i && i.container);
    const avList = normalizeList(avSnap.val()).filter(i => i && i.container);

    const totalDmgCount = dmgList.length;
    // Available count should only include containers still inside the yard.
    // If DATE OUT is filled, it is treated as released and deducted from Available.
    const totalAvCount = avList.filter(i => !String(i.dateOut || '').trim()).length;
    const grandTotal = totalDmgCount + totalAvCount;

    const percDmg = grandTotal > 0 ? ((totalDmgCount / grandTotal) * 100).toFixed(1) : 0;
    const percAv = grandTotal > 0 ? ((totalAvCount / grandTotal) * 100).toFixed(1) : 0;

    document.getElementById('dash-approved').innerText = app;
    document.getElementById('dash-repaired').innerText = rep;
    document.getElementById('dash-rem-app').innerText = rApp;
    document.getElementById('dash-rem-pend').innerText = rPen;

    document.getElementById('dash-total-dmg').innerText = totalDmgCount;
    document.getElementById('perc-dmg').innerText = `${percDmg}% OF TOTAL`;

    document.getElementById('dash-total-av').innerText = totalAvCount;
    document.getElementById('perc-av').innerText = `${percAv}% OF TOTAL`;

    const grandTotalEl = document.getElementById('dash-grand-total');
    if (grandTotalEl) grandTotalEl.innerText = grandTotal;
}
