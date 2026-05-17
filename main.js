import { monthNames, years } from "./constants.js?v=20260517flatfix2";
import "./auth.js?v=20260517flatfix2";
import "./tabs.js?v=20260517flatfix2";
import "./table.js?v=20260517flatfix2";
import "./filters.js?v=20260517flatfix2";
import "./export.js?v=20260517flatfix2";
import "./csv-upload.js?v=20260517flatfix2";

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
