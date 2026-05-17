import { monthNames } from "./constants.js?v=20260517flatfix2";
import { calculateLineStats } from "./dashboard.js?v=20260517flatfix2";

function convertDisplayDateToISO(dateText) {
    if (!dateText || !dateText.includes('-')) return "";

    const parts = dateText.split('-');
    if (parts.length !== 3) return "";

    const months = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04",
        May: "05", Jun: "06", Jul: "07", Aug: "08",
        Sep: "09", Oct: "10", Nov: "11", Dec: "12"
    };

    const day = parts[0].padStart(2, '0');
    const month = months[parts[1]];
    const year = "20" + parts[2];

    return `${year}-${month}-${day}`;
}

export function applyFilters() {
    const searchCntr = document.getElementById('f-cntr').value.toUpperCase();
    const colIndex = parseInt(document.getElementById('f-field-type').value);

    const selectedMonthNum = document.getElementById('f-month').value;
    const selectedYear = document.getElementById('f-year').value;

    const fromDate = document.getElementById('f-from').value;
    const toDate = document.getElementById('f-to').value;

    const selectedMonthLetter =
        selectedMonthNum !== "ALL" && selectedMonthNum !== "BLANK"
            ? monthNames[parseInt(selectedMonthNum)-1]
            : "";

    document.querySelectorAll('#table-body tr').forEach(tr => {

        const cntrText = tr.cells[2].innerText.toUpperCase();
        const dateText = tr.cells[colIndex].innerText;

        const p = dateText.split('-');
        const rowMonth = p[1] || "";
        const rowYear = p[2] || "";

        const rowISODate = convertDisplayDateToISO(dateText);

        let matchDate =
            (selectedMonthNum === "ALL" && selectedYear === "ALL") ||
            (selectedMonthNum === "BLANK" && dateText.trim() === "") ||
            (
                (selectedMonthNum === "ALL" || rowMonth === selectedMonthLetter)
                &&
                (selectedYear === "ALL" || rowYear === selectedYear)
            );

        let matchDuration = true;

        if (fromDate && rowISODate) {
            matchDuration = rowISODate >= fromDate;
        }

        if (toDate && rowISODate) {
            matchDuration = matchDuration && rowISODate <= toDate;
        }

        tr.style.display =
            (cntrText.includes(searchCntr) && matchDate && matchDuration)
                ? ""
                : "";

        if (!(cntrText.includes(searchCntr) && matchDate && matchDuration)) {
            tr.style.display = "none";
        }

    });

    calculateLineStats();
}

export function clearFilters() {
    document.getElementById('f-cntr').value = "";
    document.getElementById('f-field-type').value = "4";
    document.getElementById('f-month').value = "ALL";
    document.getElementById('f-year').value = "ALL";

    const from = document.getElementById('f-from');
    const to = document.getElementById('f-to');

    if (from) from.value = "";
    if (to) to.value = "";

    applyFilters();
}

window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
