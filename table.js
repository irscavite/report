import { get, onValue, ref, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { db } from "./firebase.js?v=20260517pdfreportdesignFINAL";
import { state } from "./state.js?v=20260517pdfreportdesignFINAL";
import { toDDMMYY, toISO, parseManualDate, diffDays } from "./date-utils.js?v=20260517pdfreportdesignFINAL";
import { calculateLineStats } from "./dashboard.js?v=20260517pdfreportdesignFINAL";

export async function loadData() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = "";
    document.getElementById('path-indicator').innerText = `${state.currentLine} / ${state.currentCategory}`;

    if (state.currentCategory === 'ALL') {
        const dmgSnap = await get(ref(db, `${state.currentLine}/Damage`));
        const avSnap = await get(ref(db, `${state.currentLine}/Available`));
        const dmgData = (dmgSnap.val() || []).filter(item => item && item.container).map(item => ({ ...item, _category: 'Damage' }));
        const avData = (avSnap.val() || []).filter(item => item && item.container).map(item => ({ ...item, _category: 'Available' }));
        const combinedData = [...dmgData, ...avData];
        combinedData.forEach(item => createRow(item));
    } else {
        onValue(ref(db, `${state.currentLine}/${state.currentCategory}`), (snap) => {
            tbody.innerHTML = "";
            const data = snap.val() || [];

            data.forEach(item => {
                if (item && item.container) {
                    if (state.currentCategory === 'Available' && item.dateOut.trim() !== "") {
                        return;
                    }
                    createRow(item);
                }
            });

            if (state.currentUserRole === "ADMIN") {
                while(tbody.children.length < 15) createRow();
            }

            document.querySelectorAll('#table-body tr').forEach(tr => runRowCalc(tr));
            renumber();
            calculateLineStats();
        }, { onlyOnce: true });

        return;
    }

    if (state.currentUserRole === "ADMIN") {
        while(tbody.children.length < 15) createRow();
    }

    document.querySelectorAll('#table-body tr').forEach(tr => runRowCalc(tr));
    renumber();
    calculateLineStats();
}

export function handlePaste(e) {
    if (state.currentUserRole !== "ADMIN") return;

    e.preventDefault();
    const clipboardData = (e.originalEvent || e).clipboardData.getData('text/plain');
    const rows = clipboardData.split(/\r?\n/);
    const startCell = e.target;
    const allRows = Array.from(document.querySelectorAll('#table-body tr'));
    const startRowIndex = allRows.indexOf(startCell.parentElement);

    rows.forEach((rowText, rowIndex) => {
        if (rowText.trim() === "") return;

        const columns = rowText.split(/\t/);
        const targetRow = allRows[startRowIndex + rowIndex];

        if (targetRow) {
            columns.forEach((colText, colIndex) => {
                if (startCell.dataset.col === "0") {
                    if (colIndex === 0) targetRow.cells[2].innerText = colText.trim();
                    if (colIndex === 1) targetRow.cells[15].innerText = colText.trim();
                } else if (startCell.dataset.col === "1") {
                    if (colIndex === 0) targetRow.cells[15].innerText = colText.trim();
                }
            });

            runRowCalc(targetRow);
        }
    });

    saveData();
}

export function createRow(data = null) {
    const tbody = document.getElementById('table-body');
    const tr = document.createElement('tr');
    tr.dataset.category = data && data._category ? data._category : state.currentCategory;
    const isAdmin = state.currentUserRole === "ADMIN";
    const editableAttr = isAdmin ? 'contenteditable="true"' : 'contenteditable="false"';
    const today = toDDMMYY(new Date());

    tr.innerHTML = `
        <td class="admin-only" style="display:${isAdmin ? 'table-cell' : 'none'}"><input type="checkbox" class="row-check"></td>
        <td class="readonly row-num"></td>
        <td ${editableAttr} class="editable-cell" data-col="0">${data ? data.container : ''}</td>
        <td class="readonly">${state.currentLine}</td>
        <td class="date-cell"><span>${data ? data.dateIn : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="date-cell"><span>${data ? data.eorDate : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="date-cell"><span>${data ? data.approval : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="date-cell"><span>${data ? data.repairDate : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="date-cell"><span>${data ? data.dateOut : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="readonly">${today}</td>
        <td ${editableAttr} class="editable-cell" data-col="1">${data ? data.remarks : ''}</td>
    `;

    if (isAdmin) {
        tr.querySelectorAll('.date-cell').forEach(cell => {
            const span = cell.querySelector('span');
            const input = cell.querySelector('input');

            if (span.innerText) input.value = toISO(span.innerText);

            cell.onclick = () => input.showPicker();

            input.onchange = (e) => {
                span.innerText = toDDMMYY(e.target.value);
                runRowCalc(tr);
                saveData();
            };
        });

        tr.querySelectorAll('.editable-cell').forEach(td => {
            td.addEventListener('paste', handlePaste);
            td.addEventListener('blur', () => {
                runRowCalc(tr);
                saveData();
            });
        });
    }

    tbody.appendChild(tr);
}

export function runRowCalc(tr) {
    const dIn = parseManualDate(tr.cells[4].innerText);
    const dEor = parseManualDate(tr.cells[6].innerText);
    const dApp = parseManualDate(tr.cells[8].innerText);
    const dRep = parseManualDate(tr.cells[10].innerText);
    const dOut = parseManualDate(tr.cells[12].innerText);

    tr.cells[5].innerText = diffDays(dEor, dIn);
    tr.cells[7].innerText = diffDays(dApp, dEor);
    tr.cells[9].innerText = diffDays(dRep, dApp);
    tr.cells[11].innerText = diffDays(dOut, dRep);
    tr.cells[13].innerText = diffDays(dOut, dIn);
}

export async function saveData() {
    if (state.currentUserRole !== "ADMIN") return;

    if (state.currentCategory === 'ALL') {
        alert("Cannot save changes in ALL view.");
        loadData();
        return;
    }

    const rows = [];
    const toMoveToAvailable = [];

    document.querySelectorAll('#table-body tr').forEach(tr => {
        const cntr = tr.cells[2].innerText.trim();

        if (cntr) {
            const rowData = {
                container: cntr,
                dateIn: tr.cells[4].innerText,
                eorDate: tr.cells[6].innerText,
                approval: tr.cells[8].innerText,
                repairDate: tr.cells[10].innerText,
                dateOut: tr.cells[12].innerText,
                remarks: tr.cells[15].innerText
            };

            if (state.currentCategory === 'Damage' && rowData.repairDate.trim() !== "") {
                toMoveToAvailable.push(rowData);
            } else {
                rows.push(rowData);
            }
        }
    });

    await set(ref(db, `${state.currentLine}/${state.currentCategory}`), rows);

    if (toMoveToAvailable.length > 0) {
        const avRef = ref(db, `${state.currentLine}/Available`);
        const avSnap = await get(avRef);
        let existingAv = avSnap.val() || [];
        await set(avRef, [...existingAv, ...toMoveToAvailable]);
        loadData();
    }
}

export function renumber() {
    document.querySelectorAll('.row-num').forEach((td, i) => td.innerText = i + 1);
}

export function addNewRows(n) {
    for(let i = 0; i < n; i++) createRow();
    renumber();
}

export function deleteSelectedRows() {
    if(confirm("Delete selected rows?")) {
        document.querySelectorAll('.row-check:checked').forEach(cb => cb.closest('tr').remove());
        saveData();
        renumber();
    }
}

export function toggleAll(m) {
    document.querySelectorAll('.row-check').forEach(c => c.checked = m.checked);
}

window.loadData = loadData;
window.saveData = saveData;
window.renumber = renumber;
window.addNewRows = addNewRows;
window.deleteSelectedRows = deleteSelectedRows;
window.toggleAll = toggleAll;
