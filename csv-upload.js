import { get, ref, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { db } from "./firebase.js?v=20260527statuscols";
import { state } from "./state.js?v=20260527statuscols";
import { loadData } from "./table.js?v=20260527statuscols";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function $(id) {
    return document.getElementById(id);
}

function normalizeHeader(header) {
    return String(header || "")
        .replace(/^\uFEFF/, "")
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function mapHeader(header) {
    const h = normalizeHeader(header);

    const map = {
        no: null,
        number: null,
        line: null,
        today: null,
        noofdays: null,
        days: null,
        status: "status",
        type: "type",
        classtype: "class",
        class: "class",
        classs: "class",

        cntrno: "container",
        cntr: "container",
        container: "container",
        containerno: "container",
        containernumber: "container",

        datein: "dateIn",
        eordate: "eorDate",
        eor: "eorDate",
        approval: "approval",
        approvaldate: "approval",
        approved: "approval",
        approveddate: "approval",
        repairdate: "repairDate",
        repaired: "repairDate",
        repair: "repairDate",
        dateout: "dateOut",
        outdate: "dateOut",
        remarks: "remarks",
        remark: "remarks"
    };

    return Object.prototype.hasOwnProperty.call(map, h) ? map[h] : null;
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && quoted && next === '"') {
            value += '"';
            i++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === ',' && !quoted) {
            row.push(value.trim());
            value = "";
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') i++;
            row.push(value.trim());
            if (row.some(cell => cell !== "")) rows.push(row);
            row = [];
            value = "";
        } else {
            value += char;
        }
    }

    row.push(value.trim());
    if (row.some(cell => cell !== "")) rows.push(row);

    return rows;
}

function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
}

function cleanDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    // Already in app format: 01-May-26
    if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(text)) {
        const [d, m, y] = text.split("-");
        const month = m.charAt(0).toUpperCase() + m.slice(1, 3).toLowerCase();
        return `${String(d).padStart(2, "0")}-${month}-${y}`;
    }

    // ISO format: 2026-05-16
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
        const [y, m, d] = text.split("-").map(Number);
        return formatDate(new Date(y, m - 1, d));
    }

    // Slash format: 05/16/26 or 05/16/2026. Treated as MM/DD/YY.
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(text)) {
        const [m, d, yRaw] = text.split("/").map(Number);
        const y = yRaw < 100 ? 2000 + yRaw : yRaw;
        return formatDate(new Date(y, m - 1, d));
    }

    return text;
}

function blankRow() {
    return {
        container: "",
        type: "",
        class: "",
        status: "",
        dateIn: "",
        eorDate: "",
        approval: "",
        repairDate: "",
        dateOut: "",
        remarks: ""
    };
}

function normalizeStatus(value) {
    const text = String(value || "").trim().toLowerCase();
    if (text.includes("avail")) return "Available";
    if (text.includes("damage") || text.includes("dmg")) return "Damage";
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Damage";
}

function buildRow(headers, values) {
    const row = blankRow();

    headers.forEach((header, index) => {
        const field = mapHeader(header);
        if (!field) return;

        const value = values[index] || "";
        if (field === "container") row.container = value.toUpperCase().trim();
        else if (field === "remarks") row.remarks = value.trim();
        else if (field === "type" || field === "class") row[field] = value.trim();
        else if (field === "status") row.status = normalizeStatus(value);
        else row[field] = cleanDate(value);
    });

    return row;
}

function normalizeFirebaseRows(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(row => row && row.container);
    if (typeof value === "object") return Object.values(value).filter(row => row && row.container);
    return [];
}

function hasDateOut(row) {
    return String(row?.dateOut || "").trim() !== "";
}

function normalizeContainer(value) {
    return String(value || "").toUpperCase().trim();
}


function parseAppDate(value) {
    const text = String(value || "").trim();
    if (!text) return 0;

    if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(text)) {
        const [d, m, y] = text.split("-");
        const monthIndex = monthNames.findIndex(name => name.toLowerCase() === m.slice(0, 3).toLowerCase());
        if (monthIndex >= 0) return new Date(2000 + Number(y), monthIndex, Number(d)).getTime();
    }

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
        const [y, m, d] = text.split("-").map(Number);
        return new Date(y, m - 1, d).getTime();
    }

    const parsed = Date.parse(text);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getRecordTime(row, fallbackIndex = 0) {
    return parseAppDate(row?.dateIn) || parseAppDate(row?.eorDate) || parseAppDate(row?.approval) || parseAppDate(row?.repairDate) || parseAppDate(row?.dateOut) || fallbackIndex;
}

function getLatestRecord(records) {
    return records.reduce((latest, row, index) => {
        if (!latest) return { row, time: getRecordTime(row, index + 1) };
        const time = getRecordTime(row, index + 1);
        return time >= latest.time ? { row, time } : latest;
    }, null)?.row || null;
}

function progressElements() {
    return {
        box: $("csv-progress-box"),
        title: $("csv-progress-title"),
        percent: $("csv-progress-percent"),
        bar: $("csv-progress-bar"),
        details: $("csv-progress-details"),
        error: $("csv-progress-error"),
        button: $("csv-upload-btn")
    };
}

function setProgress(percent, message, isError = false) {
    const el = progressElements();
    const pct = Math.max(0, Math.min(100, Math.round(percent)));

    if (el.box) el.box.style.display = "block";
    if (el.percent) el.percent.innerText = `${pct}%`;
    if (el.bar) {
        el.bar.style.width = `${pct}%`;
        el.bar.innerText = `${pct}%`;
    }
    if (el.details) el.details.innerText = message;
    if (el.error && isError) el.error.innerText = message;
    if (el.error && !isError) el.error.innerText = "";

    console.log(`[CSV UPLOAD] ${pct}% - ${message}`);
}

function setButton(disabled) {
    const btn = $("csv-upload-btn");
    if (!btn) return;
    btn.dataset.disabled = disabled ? "true" : "false";
    btn.style.pointerEvents = disabled ? "none" : "auto";
    btn.style.opacity = disabled ? "0.65" : "1";
    btn.innerText = disabled ? "Uploading CSV..." : "Upload CSV";
}

function delay(ms = 80) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Unable to read CSV file."));
        reader.readAsText(file);
    });
}

export async function handleCSVUpload(event) {
    const file = event?.target?.files?.[0];
    if (event?.target) event.target.value = "";

    if (!file) {
        setProgress(0, "No CSV file selected.", true);
        return;
    }

    setButton(true);
    setProgress(1, "CSV selected. Starting upload check...");
    await delay();

    try {
        if (state.currentUserRole !== "ADMIN") {
            throw new Error("Upload blocked. Please login using the ADMIN account first.");
        }

        if (!state.currentLine) {
            throw new Error("Upload blocked. Please select MAERSK, ONE, or CMA first.");
        }

        const uploadPath = `${state.currentLine}/ALL STATUS`;
        setProgress(5, `Reading file: ${file.name}`);
        await delay();

        const text = await readFileAsText(file);
        const csvRows = parseCSV(text);

        if (csvRows.length < 2) {
            throw new Error("CSV has no data rows. First row must be headers, second row onward must contain data.");
        }

        const headers = csvRows[0];
        const mappedHeaders = headers.map(mapHeader);

        if (!mappedHeaders.includes("container")) {
            throw new Error("CSV header error. Your CSV must contain CNTR NO., container, containerNumber, or containerNo.");
        }

        setProgress(15, `CSV read complete. ${csvRows.length - 1} row(s) detected.`);
        await delay();

        const importedRows = csvRows
            .slice(1)
            .map(values => buildRow(headers, values))
            .filter(row => row.container);

        if (importedRows.length === 0) {
            throw new Error("No valid container numbers found in the CSV.");
        }

        setProgress(25, `Checking Firebase paths: ${state.currentLine}/Damage and ${state.currentLine}/Available`);
        await delay();

        const damageRef = ref(db, `${state.currentLine}/Damage`);
        const availableRef = ref(db, `${state.currentLine}/Available`);
        const damageSnapshot = await get(damageRef);
        const availableSnapshot = await get(availableRef);
        const existingDamageRows = normalizeFirebaseRows(damageSnapshot.val()).map(row => ({ ...row, status: normalizeStatus(row.status || 'Damage') }));
        const existingAvailableRows = normalizeFirebaseRows(availableSnapshot.val()).map(row => ({ ...row, status: normalizeStatus(row.status || 'Available') }));
        const existingRows = [...existingDamageRows, ...existingAvailableRows];

        // Duplicate rule based on the LATEST previous record only:
        // - If the latest same CNTR NO. has NO Date Out, skip the uploaded duplicate.
        // - If the latest same CNTR NO. already has Date Out / Gate Out, allow a new record.
        // This allows historical cycles while blocking two active records for the same container.
        const recordsByContainer = new Map();

        existingRows.forEach(row => {
            const container = normalizeContainer(row.container);
            if (!container) return;
            if (!recordsByContainer.has(container)) recordsByContainer.set(container, []);
            recordsByContainer.get(container).push(row);
        });

        const newRows = [];
        let skippedActiveDuplicateCount = 0;
        let allowedGateOutDuplicateCount = 0;

        importedRows.forEach(row => {
            row.container = normalizeContainer(row.container);
            row.status = normalizeStatus(row.status || row.remarks || 'Damage');

            const previousRecords = recordsByContainer.get(row.container) || [];
            const latestRecord = getLatestRecord(previousRecords);

            if (latestRecord && !hasDateOut(latestRecord)) {
                skippedActiveDuplicateCount++;
                return;
            }

            if (latestRecord && hasDateOut(latestRecord)) {
                allowedGateOutDuplicateCount++;
            }

            newRows.push(row);

            // The newly accepted row becomes the latest previous record for later rows in the same CSV.
            // If it has no Date Out, another same CNTR NO. in this same CSV will be skipped.
            if (!recordsByContainer.has(row.container)) recordsByContainer.set(row.container, []);
            recordsByContainer.get(row.container).push(row);
        });

        if (newRows.length === 0) {
            setProgress(100, `No upload needed. ${skippedActiveDuplicateCount} duplicate container(s) still have no Date Out.`);
            alert(`No rows uploaded.

Skipped active duplicates: ${skippedActiveDuplicateCount}

A duplicate CNTR NO. can be uploaded only when the previous record already has DATE OUT / Gate Out.`);
            return;
        }

        const damageNewRows = newRows.filter(row => normalizeStatus(row.status) !== 'Available').map(row => ({ ...row, status: 'Damage' }));
        const availableNewRows = newRows.filter(row => normalizeStatus(row.status) === 'Available').map(row => ({ ...row, status: 'Available' }));

        const proceed = confirm(
            `Upload ${newRows.length} new row(s)?` +
            `\n\nDamage: ${damageNewRows.length}` +
            `\nAvailable: ${availableNewRows.length}` +
            (allowedGateOutDuplicateCount ? `\nAllowed duplicate with previous Date Out/Gate Out: ${allowedGateOutDuplicateCount}` : "") +
            (skippedActiveDuplicateCount ? `\nSkipped active duplicates without Date Out: ${skippedActiveDuplicateCount}` : "")
        );

        if (!proceed) {
            setProgress(0, "Upload cancelled by user.");
            return;
        }

        setProgress(45, `Uploading ${newRows.length} row(s) by STATUS...`);
        await delay();

        await set(damageRef, [...existingDamageRows, ...damageNewRows]);
        await set(availableRef, [...existingAvailableRows, ...availableNewRows]);

        setProgress(80, "Firebase accepted the upload. Verifying saved data...");
        await delay();

        const verifyDamage = normalizeFirebaseRows((await get(damageRef)).val());
        const verifyAvailable = normalizeFirebaseRows((await get(availableRef)).val());
        const verifiedRows = [...verifyDamage, ...verifyAvailable];
        const verifiedSet = new Set(verifiedRows.map(row => String(row.container).toUpperCase().trim()));
        const missingRows = newRows.filter(row => !verifiedSet.has(row.container));

        if (missingRows.length > 0) {
            throw new Error(`Firebase write finished, but verification failed. Missing: ${missingRows.map(r => r.container).join(", ")}`);
        }

        setProgress(90, "Refreshing table...");
        await delay();

        await loadData();

        setProgress(100, `Upload complete. Uploaded ${newRows.length} row(s).`);
        alert(`CSV upload complete.\n\nUploaded: ${newRows.length}\nDamage: ${damageNewRows.length}\nAvailable: ${availableNewRows.length}\nAllowed duplicates with previous Date Out/Gate Out: ${allowedGateOutDuplicateCount}\nSkipped active duplicates without Date Out: ${skippedActiveDuplicateCount}`);
    } catch (error) {
        const message = error?.message || String(error);
        setProgress(0, message, true);
        console.error("CSV upload failed:", error);
        alert(`CSV upload failed:\n\n${message}`);
    } finally {
        setButton(false);
    }
}

window.handleCSVUpload = handleCSVUpload;
window.openCSVFileSelector = function () {
    const input = $("csv-file");
    if (!input) {
        alert("CSV input not found in index.html.");
        return;
    }
    input.click();
};

document.addEventListener("DOMContentLoaded", () => {
    const input = $("csv-file");

    if (input) {
        input.addEventListener("change", handleCSVUpload);
    }

    console.log("[CSV UPLOAD] Module loaded successfully. CSV button uses label-for-file-input fallback.");
});
