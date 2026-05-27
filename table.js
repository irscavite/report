import { get, onValue, ref, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { db } from "./firebase.js?v=20260527statuscols";
import { state } from "./state.js?v=20260527statuscols";
import { toDDMMYY, toISO, parseManualDate, diffDays } from "./date-utils.js?v=20260527statuscols";
import { calculateLineStats } from "./dashboard.js?v=20260527statuscols";

function normalizeStatus(value) {
    const text = String(value || '').trim().toLowerCase();
    if (text.includes('avail')) return 'Available';
    if (text.includes('damage') || text.includes('dmg')) return 'Damage';
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Damage';
}

function getStatusFromCell(cell, fallback = 'Damage') {
    const select = cell?.querySelector?.('.status-select');
    return normalizeStatus(select ? select.value : (cell?.innerText || fallback));
}

function setStatusCell(cell, value) {
    const status = normalizeStatus(value);
    const select = cell?.querySelector?.('.status-select');
    if (select) select.value = status;
    else if (cell) cell.innerText = status;
    return status;
}

export async function loadData() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = "";
    document.getElementById('path-indicator').innerText = `${state.currentLine} / ALL STATUS`;

    if (!state.currentLine) return;

    const dmgSnap = await get(ref(db, `${state.currentLine}/Damage`));
    const avSnap = await get(ref(db, `${state.currentLine}/Available`));

    const normalizeRows = (value, category) => {
        const list = Array.isArray(value) ? value : (value && typeof value === 'object' ? Object.values(value) : []);
        return list
            .filter(item => item && item.container)
            .map(item => ({
                ...item,
                status: normalizeStatus(item.status || category),
                _category: normalizeStatus(item.status || category)
            }));
    };

    const combinedData = [
        ...normalizeRows(dmgSnap.val(), 'Damage'),
        ...normalizeRows(avSnap.val(), 'Available')
    ];

    combinedData.forEach(item => createRow(item, true));

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
    const startCell = e.target.closest ? e.target.closest('td') : e.target;
    const startRow = e.target.closest ? e.target.closest('tr') : startCell.parentElement;
    const allRows = Array.from(document.querySelectorAll('#table-body tr'));
    const startRowIndex = allRows.indexOf(startRow);
    const editableColumns = [2, 3, 4, 5, 18]; // CNTR, TYPE, CLASS, STATUS, REMARKS
    const startCol = editableColumns.includes(startCell.cellIndex) ? startCell.cellIndex : 2;
    const startEditableIndex = editableColumns.indexOf(startCol);

    rows.forEach((rowText, rowIndex) => {
        if (rowText.trim() === "") return;

        const columns = rowText.split(/	/);
        const targetRow = allRows[startRowIndex + rowIndex];

        if (targetRow) {
            columns.forEach((colText, colIndex) => {
                const targetCellIndex = editableColumns[startEditableIndex + colIndex];
                if (targetCellIndex !== undefined && targetRow.cells[targetCellIndex]) {
                    if (targetCellIndex === 5) {
                        setStatusCell(targetRow.cells[targetCellIndex], colText.trim());
                        targetRow.dataset.category = getStatusFromCell(targetRow.cells[targetCellIndex]);
                    } else {
                        targetRow.cells[targetCellIndex].innerText = colText.trim();
                    }
                }
            });

            runRowCalc(targetRow);
        }
    });

    saveData();
}


function normalizeDateOutText(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return { display: '', iso: '' };

    // App format: 24-May-26
    if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(text)) {
        const parts = text.split('-');
        const day = parts[0].padStart(2, '0');
        const mon = parts[1].slice(0, 3);
        const yy = parts[2].slice(-2);
        const display = `${day}-${mon.charAt(0).toUpperCase()}${mon.slice(1).toLowerCase()}-${yy}`;
        return { display, iso: toISO(display) };
    }

    // Date picker / ISO format: 2026-05-24
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
        const [y, m, d] = text.split('-').map(v => v.padStart(2, '0'));
        const iso = `${y}-${m}-${d}`;
        return { display: toDDMMYY(iso), iso };
    }

    // Excel-style typed dates: 24/05/2026, 24-05-2026, 24.05.26
    const numeric = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (numeric) {
        let [, d, m, y] = numeric;
        if (y.length === 2) y = `20${y}`;
        const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        return { display: toDDMMYY(iso), iso };
    }

    return null;
}

function setDateOutForRow(tr, value) {
    const normalized = normalizeDateOutText(value);
    if (!normalized) return false;

    const cell = tr.cells[15];
    const span = cell.querySelector('span');
    const input = cell.querySelector('input[type="date"]');
    span.innerText = normalized.display;
    if (input) input.value = normalized.iso;
    runRowCalc(tr);
    return true;
}

function getCheckedRows() {
    return Array.from(document.querySelectorAll('#table-body .row-check:checked'))
        .map(cb => cb.closest('tr'));
}

function flashButton(btn, ok, normalText) {
    btn.textContent = ok ? '✓' : '✗';
    btn.classList.add(ok ? 'paste-ok' : 'paste-fail');
    setTimeout(() => {
        btn.textContent = normalText;
        btn.classList.remove('paste-ok', 'paste-fail');
    }, 1200);
}

function applyDateOutPaste(startTr, text) {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map(line => line.split('\t')[0].trim())
        .filter(Boolean);

    if (!lines.length) return false;

    const checkedRows = getCheckedRows();
    let targetRows = checkedRows.length ? checkedRows : [];

    if (!targetRows.length) {
        const allRows = Array.from(document.querySelectorAll('#table-body tr'));
        const startIndex = allRows.indexOf(startTr);
        targetRows = lines.length === 1 ? [startTr] : allRows.slice(startIndex, startIndex + lines.length);
    }

    let changed = 0;
    targetRows.forEach((row, index) => {
        const value = lines.length === 1 ? lines[0] : lines[index];
        if (value && setDateOutForRow(row, value)) changed++;
    });

    if (changed) saveData();
    return changed > 0;
}

function setupManualDateOutCell(cell, tr) {
    const span = cell.querySelector('.manual-dateout');
    const input = cell.querySelector('input[type="date"]');

    cell.addEventListener('paste', (e) => {
        if (e.target !== span && e.target !== input) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            applyDateOutPaste(tr, text);
        }
    });
    span.addEventListener('click', (e) => e.stopPropagation());
    span.addEventListener('focus', () => document.execCommand('selectAll', false, null));
    span.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            span.blur();
        }
    });
    span.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        applyDateOutPaste(tr, text);
    });
    span.addEventListener('blur', () => {
        const text = span.innerText.trim();
        if (!text) {
            if (input) input.value = '';
            runRowCalc(tr);
            saveData();
            return;
        }
        if (setDateOutForRow(tr, text)) saveData();
    });

    if (input) {
        input.addEventListener('click', (e) => e.stopPropagation());
    }
}

export function createRow(data = null, isAll = false) {
    const tbody = document.getElementById('table-body');
    const tr = document.createElement('tr');
    tr.dataset.category = data && data._category ? data._category : state.currentCategory;
    const isAdmin = state.currentUserRole === "ADMIN";
    const isAvailable = !isAll && state.currentCategory === 'Available';
    const editableAttr = isAdmin ? 'contenteditable="true"' : 'contenteditable="false"';
    const today = toDDMMYY(new Date());
    const currentStatus = normalizeStatus(data ? (data.status || data._category || state.currentCategory) : (state.currentCategory || 'Damage'));
    const statusControl = isAdmin
        ? `<select class="status-select" data-col="4"><option value="Damage" ${currentStatus === 'Damage' ? 'selected' : ''}>DAMAGE</option><option value="Available" ${currentStatus === 'Available' ? 'selected' : ''}>AVAILABLE</option></select>`
        : currentStatus;

    tr.innerHTML = `
        <td class="admin-only" style="display:${isAdmin ? 'table-cell' : 'none'}"><input type="checkbox" class="row-check"></td>
        <td class="readonly row-num"></td>
        <td ${editableAttr} class="editable-cell" data-col="0">${data ? data.container : ''}</td>
        <td ${editableAttr} class="editable-cell" data-col="2">${data ? (data.type || '') : ''}</td>
        <td ${editableAttr} class="editable-cell" data-col="3">${data ? (data.class || '') : ''}</td>
        <td class="status-cell">${statusControl}</td>
        <td class="readonly">${state.currentLine}</td>
        <td class="date-cell"><span>${data ? data.dateIn : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="date-cell"><span>${data ? data.eorDate : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="date-cell"><span>${data ? data.approval : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="date-cell"><span>${data ? data.repairDate : ''}</span>${isAdmin ? '<input type="date">' : ''}</td>
        <td class="readonly"></td>
        <td class="date-cell dateout-cell"><span class="manual-dateout" ${isAdmin ? 'contenteditable="true" spellcheck="false" title="Type or paste Date Out. Check multiple rows first to paste one date to all checked rows."' : ''}>${data ? data.dateOut : ''}</span></td>
        <td class="readonly"></td>
        <td class="readonly">${today}</td>
        <td ${editableAttr} class="editable-cell remarks-cell" data-col="1">${data ? data.remarks : ''}</td>
    `;

    if (isAdmin) {
        tr.querySelectorAll('.date-cell').forEach(cell => {
            const span = cell.querySelector('span');
            const input = cell.querySelector('input');

            if (input && span.innerText) input.value = toISO(span.innerText);

            if (cell.classList.contains('dateout-cell')) {
                setupManualDateOutCell(cell, tr);
            } else if (input) {
                cell.onclick = () => input.showPicker();
                input.onchange = (e) => {
                    span.innerText = toDDMMYY(e.target.value);
                    runRowCalc(tr);
                    saveData();
                };
            }
        });

        const statusSelect = tr.querySelector('.status-select');
        if (statusSelect) {
            statusSelect.addEventListener('change', () => {
                tr.dataset.category = normalizeStatus(statusSelect.value);
                saveData();
            });
            statusSelect.addEventListener('paste', handlePaste);
        }

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
    const dIn = parseManualDate(tr.cells[7].innerText);
    const dEor = parseManualDate(tr.cells[9].innerText);
    const dApp = parseManualDate(tr.cells[11].innerText);
    const dRep = parseManualDate(tr.cells[13].innerText);
    const dOut = parseManualDate(tr.cells[15].innerText);

    tr.cells[8].innerText = diffDays(dEor, dIn);
    tr.cells[10].innerText = diffDays(dApp, dEor);
    tr.cells[12].innerText = diffDays(dRep, dApp);
    tr.cells[14].innerText = diffDays(dOut, dRep);
    tr.cells[16].innerText = diffDays(dOut, dIn);
}

export async function saveData() {
    if (state.currentUserRole !== "ADMIN") return;

    const damageRows = [];
    const availableRows = [];

    document.querySelectorAll('#table-body tr').forEach(tr => {
        const cntr = tr.cells[2].innerText.trim();

        if (cntr) {
            const status = getStatusFromCell(tr.cells[5], tr.dataset.category || 'Damage');
            setStatusCell(tr.cells[5], status);
            tr.dataset.category = status;

            const rowData = {
                container: cntr,
                type: tr.cells[3].innerText.trim(),
                class: tr.cells[4].innerText.trim(),
                status,
                dateIn: tr.cells[7].innerText.trim(),
                eorDate: tr.cells[9].innerText.trim(),
                approval: tr.cells[11].innerText.trim(),
                repairDate: tr.cells[13].innerText.trim(),
                dateOut: tr.cells[15].innerText.trim(),
                remarks: tr.cells[18].innerText.trim()
            };

            if (status === 'Available') availableRows.push(rowData);
            else damageRows.push({ ...rowData, status: 'Damage' });
        }
    });

    await set(ref(db, `${state.currentLine}/Damage`), damageRows);
    await set(ref(db, `${state.currentLine}/Available`), availableRows);
    calculateLineStats();
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

export function copyDateOut(btn) {
    const cell = btn.closest('.date-cell');
    const span = cell.querySelector('span');
    const text = span ? span.innerText.trim() : '';
    if (!text) {
        btn.textContent = '✗';
        btn.classList.add('copy-fail');
        setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove('copy-fail'); }, 1200);
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✓';
        btn.classList.add('copy-ok');
        setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove('copy-ok'); }, 1200);
    }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.textContent = '✓';
        btn.classList.add('copy-ok');
        setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove('copy-ok'); }, 1200);
    });
}

window.copyDateOut = copyDateOut;

export function pasteDateOut(btn) {
    const tr = btn.closest('tr');

    navigator.clipboard.readText().then(text => {
        const ok = applyDateOutPaste(tr, text);
        flashButton(btn, ok, '📋');
    }).catch(() => {
        flashButton(btn, false, '📋');
    });
}

window.pasteDateOut = pasteDateOut;


window.saveData = saveData;
window.renumber = renumber;
window.addNewRows = addNewRows;
window.deleteSelectedRows = deleteSelectedRows;
window.toggleAll = toggleAll;
