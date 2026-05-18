import { monthNames, years } from "./constants.js?v=20260517pdfreportdesignFINAL";
import "./auth.js?v=20260517pdfreportdesignFINAL";
import "./tabs.js?v=20260517pdfreportdesignFINAL";
import "./table.js?v=20260517pdfreportdesignFINAL";
import "./filters.js?v=20260517pdfreportdesignFINAL";
import "./export.js?v=20260517pdfreportdesignFINAL";
import "./csv-upload.js?v=20260517pdfreportdesignFINAL";

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
