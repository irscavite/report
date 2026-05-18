import { get, ref, set } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { db } from "./firebase.js?v=20260517pdfreportdesignFINAL";
import { state } from "./state.js?v=20260517pdfreportdesignFINAL";
import { loadData } from "./table.js?v=20260517pdfreportdesignFINAL";

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
        status: null,

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
        dateIn: "",
        eorDate: "",
        approval: "",
        repairDate: "",
        dateOut: "",
        remarks: ""
    };
}

function buildRow(headers, values) {
    const row = blankRow();

    headers.forEach((header, index) => {
        const field = mapHeader(header);
        if (!field) return;

        const value = values[index] || "";
        if (field === "container") row.container = value.toUpperCase().trim();
        else if (field === "remarks") row.remarks = value.trim();
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

        if (!state.currentCategory || state.currentCategory === "ALL") {
            throw new Error("Upload blocked. Please select DAMAGE or AVAILABLE. Do not upload while in ALL view.");
        }

        const uploadPath = `${state.currentLine}/${state.currentCategory}`;
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

        setProgress(25, `Checking Firebase path: ${uploadPath}`);
        await delay();

        const databaseRef = ref(db, uploadPath);
        const snapshot = await get(databaseRef);
        const existingRows = normalizeFirebaseRows(snapshot.val());
        const existingContainers = new Set(existingRows.map(row => String(row.container).toUpperCase().trim()));

        const newRows = [];
        let duplicateCount = 0;

        importedRows.forEach(row => {
            if (existingContainers.has(row.container)) duplicateCount++;
            else {
                existingContainers.add(row.container);
                newRows.push(row);
            }
        });

        if (newRows.length === 0) {
            setProgress(100, `No upload needed. All ${importedRows.length} container(s) already exist in ${uploadPath}.`);
            alert(`No rows uploaded. All ${importedRows.length} container(s) already exist.`);
            return;
        }

        const proceed = confirm(
            `Upload ${newRows.length} new row(s) to Firebase path: ${uploadPath}?` +
            (duplicateCount ? `\n\nDuplicate rows skipped: ${duplicateCount}` : "")
        );

        if (!proceed) {
            setProgress(0, "Upload cancelled by user.");
            return;
        }

        const finalRows = [...existingRows, ...newRows];

        // This is the important fix: save the whole Firebase array exactly like the app's normal Save button.
        // The older version saved row-by-row, which can fail or create unreadable structures in this app.
        setProgress(45, `Uploading ${newRows.length} row(s) to ${uploadPath}...`);
        await delay();

        await set(databaseRef, finalRows);

        setProgress(80, "Firebase accepted the upload. Verifying saved data...");
        await delay();

        const verifySnapshot = await get(databaseRef);
        const verifiedRows = normalizeFirebaseRows(verifySnapshot.val());
        const verifiedSet = new Set(verifiedRows.map(row => String(row.container).toUpperCase().trim()));
        const missingRows = newRows.filter(row => !verifiedSet.has(row.container));

        if (missingRows.length > 0) {
            throw new Error(`Firebase write finished, but verification failed. Missing: ${missingRows.map(r => r.container).join(", ")}`);
        }

        setProgress(90, "Refreshing table...");
        await delay();

        await loadData();

        setProgress(100, `Upload complete. Uploaded ${newRows.length} row(s). Total in ${uploadPath}: ${verifiedRows.length}.`);
        alert(`CSV upload complete.\n\nUploaded: ${newRows.length}\nSkipped duplicates: ${duplicateCount}\nFirebase path: ${uploadPath}`);
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
