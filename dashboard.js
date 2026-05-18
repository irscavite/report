import { get, ref } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { db } from "./firebase.js?v=20260517pdfreportdesignFINAL";
import { state } from "./state.js?v=20260517pdfreportdesignFINAL";

export async function calculateLineStats() {
    const rows = Array.from(document.querySelectorAll('#table-body tr'));
    const visibleRows = rows.filter(tr => tr.style.display !== 'none' && tr.cells[2].innerText.trim() !== "");

    const filteredTotalEl = document.getElementById('filtered-total-count');
    if (filteredTotalEl) filteredTotalEl.innerText = visibleRows.length;

    let filteredDamage = 0;
    let filteredAvailable = 0;
    visibleRows.forEach(tr => {
        const rowCategory = tr.dataset.category || state.currentCategory;
        if (rowCategory === 'Damage') filteredDamage++;
        if (rowCategory === 'Available') filteredAvailable++;
    });

    const filteredDamagePercent = visibleRows.length > 0 ? ((filteredDamage / visibleRows.length) * 100).toFixed(1) : '0.0';
    const filteredAvailablePercent = visibleRows.length > 0 ? ((filteredAvailable / visibleRows.length) * 100).toFixed(1) : '0.0';

    const filteredDamageEl = document.getElementById('filtered-total-damage');
    if (filteredDamageEl) filteredDamageEl.innerText = `${filteredDamage} (${filteredDamagePercent}%)`;

    const filteredAvailableEl = document.getElementById('filtered-total-available');
    if (filteredAvailableEl) filteredAvailableEl.innerText = `${filteredAvailable} (${filteredAvailablePercent}%)`;

    let app = 0, rep = 0, rApp = 0, rPen = 0;

    visibleRows.forEach(tr => {
        const hasApp = tr.cells[8].innerText.trim() !== "";
        const hasRep = tr.cells[10].innerText.trim() !== "";

        if (hasApp) app++;
        if (hasRep) rep++;
        if (hasApp && !hasRep) rApp++;
        if (!hasApp) rPen++;
    });

    const dmgSnap = await get(ref(db, `${state.currentLine}/Damage`));
    const avSnap = await get(ref(db, `${state.currentLine}/Available`));

    const dmgList = (dmgSnap.val() || []).filter(i => i && i.container);
    const avList = (avSnap.val() || []).filter(i => i && i.container && i.dateOut.trim() === "");

    const totalDmgCount = dmgList.length;
    const totalAvCount = avList.length;
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
