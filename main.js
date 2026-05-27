import { monthNames, years } from "./constants.js?v=20260527statuscols";
import "./auth.js?v=20260527statuscols";
import "./tabs.js?v=20260527statuscols";
import "./table.js?v=20260527statuscols";
import "./filters.js?v=20260527statuscols";
import "./export.js?v=20260527statuscols";
import "./csv-upload.js?v=20260527statuscols";

function initFilterOptions() {
    const monthSel = document.getElementById('f-month');
    const yearSel = document.getElementById('f-year');

    monthNames.forEach((m, i) => {
        let opt = document.createElement('option');
        opt.value = String(i + 1).padStart(2, '0');
        opt.innerText = m;
        monthSel.appendChild(opt);
    });

    years.forEach(y => {
        let opt = document.createElement('option');
        opt.value = y;
        opt.innerText = `20${y}`;
        yearSel.appendChild(opt);
    });
}

initFilterOptions();


const panelMap = {
    dashboard: 'panel-dashboard',
    filters: 'panel-filters',
    remarks: 'remarks-summary-box',
    table: 'panel-table'
};

function setNavState(key, visible) {
    const btn = document.getElementById(`nav-${key}`);
    if (!btn) return;
    btn.classList.toggle('active', visible);
}

window.togglePanel = function(key) {
    const panel = document.getElementById(panelMap[key]);
    if (!panel) return;

    panel.classList.toggle('panel-hidden');
    setNavState(key, !panel.classList.contains('panel-hidden'));
};

window.showAllPanels = function() {
    Object.entries(panelMap).forEach(([key, id]) => {
        const panel = document.getElementById(id);
        if (panel) panel.classList.remove('panel-hidden');
        setNavState(key, true);
    });
};

window.compactView = function() {
    Object.entries(panelMap).forEach(([key, id]) => {
        const panel = document.getElementById(id);
        if (!panel) return;
        const shouldShow = key === 'filters' || key === 'table';
        panel.classList.toggle('panel-hidden', !shouldShow);
        setNavState(key, shouldShow);
    });
};

window.addEventListener('DOMContentLoaded', () => {
    // Default to a cleaner workspace: keep filters + table, hide the big dashboard and remarks summary.
    window.compactView();
});
