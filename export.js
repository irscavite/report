import { state } from "./state.js?v=20260527statuscols";

function getCellText(cell) {
    const select = cell?.querySelector?.('select');
    return select ? select.value : (cell?.innerText || '');
}

function cleanSingleLine(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanRemarks(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
    const n = parseInt(String(value || "0").replace(/[^\d-]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
}

function getText(id, fallback = "0") {
    const el = document.getElementById(id);
    return el ? el.innerText.trim() : fallback;
}

function percent(part, total) {
    return total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";
}

const EXPORT_COLUMNS = [
    { key: "no", label: "NO.", cellIndex: 1 },
    { key: "cntrNo", label: "CNTR NO.", cellIndex: 2 },
    { key: "type", label: "TYPE", cellIndex: 3 },
    { key: "class", label: "CLASS", cellIndex: 4 },
    { key: "status", label: "STATUS", cellIndex: 5 },
    { key: "line", label: "LINE", cellIndex: 6 },
    { key: "dateIn", label: "DATE IN", cellIndex: 7 },
    { key: "daysIn", label: "NO. OF DAYS\nDate IN to EOR", cellIndex: 8 },
    { key: "eorDate", label: "EOR DATE", cellIndex: 9 },
    { key: "daysEor", label: "NO. OF DAYS\nEOR to Approval", cellIndex: 10 },
    { key: "approval", label: "APPROVAL", cellIndex: 11 },
    { key: "daysApproval", label: "NO. OF DAYS\nApproval to Repaired", cellIndex: 12 },
    { key: "repair", label: "REPAIR", cellIndex: 13 },
    { key: "daysRepair", label: "NO. OF DAYS\nRepaired to DateOUT", cellIndex: 14 },
    { key: "dateOut", label: "DATE OUT", cellIndex: 15 },
    { key: "totalDays", label: "TOTAL DAYS", cellIndex: 16 },
    { key: "today", label: "TODAY", cellIndex: 17 },
    { key: "remarks", label: "REMARKS", cellIndex: 18 }
];

const DEFAULT_EXPORT_KEYS = EXPORT_COLUMNS.map(c => c.key);

function getVisibleRows() {
    return Array.from(document.querySelectorAll("#table-body tr"))
        .filter(row => row.style.display !== "none" && row.cells[2] && cleanSingleLine(row.cells[2].innerText) !== "");
}

function getSelectedColumns(keys) {
    const selected = Array.isArray(keys) && keys.length ? keys : DEFAULT_EXPORT_KEYS;
    return EXPORT_COLUMNS.filter(col => selected.includes(col.key));
}

function getRowValue(row, col) {
    const value = col.key === "status"
        ? getCellText(row.cells[col.cellIndex])
        : row.cells[col.cellIndex]?.innerText;

    return col.key === "remarks" ? cleanRemarks(value) : cleanSingleLine(value);
}

function buildExportMatrix(rows, selectedColumns) {
    const headers = selectedColumns.map(col => col.label);
    const body = rows.map(row => selectedColumns.map(col => getRowValue(row, col)));
    return { headers, body };
}

function calculateFilteredCounts(rows) {
    let filteredDamage = 0;
    let filteredAvailable = 0;

    rows.forEach(row => {
        const status = cleanSingleLine(getCellText(row.cells[5])).toLowerCase();
        const dateOut = row.cells[15] ? cleanSingleLine(row.cells[15].innerText) : "";

        if (status === "damage" || status === "dmg") filteredDamage++;
        if ((status === "available" || status === "avail") && !dateOut) filteredAvailable++;
    });

    return {
        filteredDamage,
        filteredAvailable,
        filteredTotal: rows.length,
        filteredDmgPercent: percent(filteredDamage, rows.length),
        filteredAvPercent: percent(filteredAvailable, rows.length)
    };
}

function createExportModalIfMissing() {
    if (document.getElementById("export-column-modal")) return;

    const modal = document.createElement("div");
    modal.id = "export-column-modal";
    modal.className = "export-modal-overlay";
    modal.style.display = "none";

    const columnCheckboxes = EXPORT_COLUMNS.map(col => `
        <label class="export-column-option">
            <input type="checkbox" class="export-column-check" value="${col.key}" checked>
            <span>${col.label.replace(/\n/g, "<small>")}${col.label.includes("\n") ? "</small>" : ""}</span>
        </label>
    `).join("");

    modal.innerHTML = `
        <div class="export-modal-box">
            <div class="export-modal-header">
                <div>
                    <h3 id="export-modal-title">Select columns to export</h3>
                    <p>Choose which columns will be shown in the PDF or Excel file.</p>
                </div>
                <button type="button" class="export-modal-close" id="export-modal-cancel-x">×</button>
            </div>

            <div class="export-modal-actions-top">
                <button type="button" class="export-small-btn" id="export-select-all">Select All</button>
                <button type="button" class="export-small-btn" id="export-clear-all">Clear All</button>
                <button type="button" class="export-small-btn" id="export-default-all">Default</button>
            </div>

            <div class="export-column-grid">
                ${columnCheckboxes}
            </div>

            <div class="export-modal-footer">
                <button type="button" class="export-cancel-btn" id="export-modal-cancel">Cancel</button>
                <button type="button" class="export-generate-btn" id="export-modal-generate">Generate</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function showExportColumnModal(format) {
    createExportModalIfMissing();

    const modal = document.getElementById("export-column-modal");
    const title = document.getElementById("export-modal-title");
    const checks = Array.from(modal.querySelectorAll(".export-column-check"));
    const generateBtn = document.getElementById("export-modal-generate");

    title.innerText = `Select columns for ${format.toUpperCase()}`;
    generateBtn.innerText = `Generate ${format.toUpperCase()}`;

    checks.forEach(cb => cb.checked = DEFAULT_EXPORT_KEYS.includes(cb.value));
    modal.style.display = "flex";

    return new Promise(resolve => {
        const close = (result) => {
            modal.style.display = "none";
            cleanup();
            resolve(result);
        };

        const cleanup = () => {
            document.getElementById("export-modal-cancel").onclick = null;
            document.getElementById("export-modal-cancel-x").onclick = null;
            document.getElementById("export-select-all").onclick = null;
            document.getElementById("export-clear-all").onclick = null;
            document.getElementById("export-default-all").onclick = null;
            generateBtn.onclick = null;
        };

        document.getElementById("export-modal-cancel").onclick = () => close(null);
        document.getElementById("export-modal-cancel-x").onclick = () => close(null);

        document.getElementById("export-select-all").onclick = () => {
            checks.forEach(cb => cb.checked = true);
        };

        document.getElementById("export-clear-all").onclick = () => {
            checks.forEach(cb => cb.checked = false);
        };

        document.getElementById("export-default-all").onclick = () => {
            checks.forEach(cb => cb.checked = DEFAULT_EXPORT_KEYS.includes(cb.value));
        };

        generateBtn.onclick = () => {
            const selectedKeys = checks.filter(cb => cb.checked).map(cb => cb.value);
            if (!selectedKeys.length) {
                alert("Please select at least one column.");
                return;
            }
            close(selectedKeys);
        };
    });
}

export async function exportExcel() {
    const selectedKeys = await showExportColumnModal("excel");
    if (!selectedKeys) return;

    const rows = getVisibleRows();
    const selectedColumns = getSelectedColumns(selectedKeys);
    const { headers, body } = buildExportMatrix(rows, selectedColumns);

    const wsData = [
        [`${state.currentLine || "MNR"} REPORT`],
        [`Generated: ${new Date().toLocaleString("en-US")}`],
        [],
        headers,
        ...body
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = selectedColumns.map(col => ({
        wch: col.key === "remarks" ? 42 : Math.max(10, col.label.replace(/\n/g, " ").length + 2)
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, state.currentLine || "MNR");
    XLSX.writeFile(wb, `MNR_${state.currentLine || "ALL"}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export async function exportPDF() {
    const selectedKeys = await showExportColumnModal("pdf");
    if (!selectedKeys) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const usableWidth = pageWidth - (marginX * 2);
    const reportDate = new Date();
    const reportDateText = reportDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const generatedText = reportDate.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });

    const approved = toNumber(getText("dash-approved"));
    const repaired = toNumber(getText("dash-repaired"));
    const remApp = toNumber(getText("dash-rem-app"));
    const remPend = toNumber(getText("dash-rem-pend"));
    const totalDmg = toNumber(getText("dash-total-dmg"));
    const totalAv = toNumber(getText("dash-total-av"));
    const grandTotal = toNumber(getText("dash-grand-total")) || (totalDmg + totalAv) || (approved + remApp + remPend);
    const dmgPercent = percent(totalDmg, grandTotal);
    const avPercent = percent(totalAv, grandTotal);

    const rows = getVisibleRows();
    const counts = calculateFilteredCounts(rows);
    const selectedLine = state.currentLine || "ALL";
    const selectedCategory = (state.currentCategory || "ALL").toUpperCase();
    const reportTitle = `${selectedLine} REPORT`;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setTextColor(10, 35, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(reportTitle, marginX, 32);

    doc.setTextColor(30, 45, 65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Container Repair & Damage Summary", marginX, 49);

    doc.setFontSize(8.5);
    doc.setTextColor(35, 45, 60);
    doc.setFont("helvetica", "normal");
    const metaLine = `Report Date: ${reportDateText}   |   Line: ${selectedLine}   |   Status View: ${selectedCategory}`;
    const generatedLine = `Generated: ${generatedText}`;
    doc.text(metaLine, marginX, 66);
    doc.text(generatedLine, marginX, 80);

    doc.setDrawColor(10, 35, 80);
    doc.setLineWidth(1.6);
    doc.line(marginX, 92, pageWidth - marginX, 92);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(10, 35, 80);
    doc.text("EXECUTIVE SUMMARY", marginX, 116);

    const summaryCellWidth = usableWidth / 7;
    const summaryColumnStyles = {
        0: { cellWidth: summaryCellWidth },
        1: { cellWidth: summaryCellWidth },
        2: { cellWidth: summaryCellWidth },
        3: { cellWidth: summaryCellWidth },
        4: { cellWidth: summaryCellWidth },
        5: { cellWidth: summaryCellWidth },
        6: { cellWidth: summaryCellWidth }
    };

    doc.autoTable({
        head: [[
            "APPROVED",
            "REPAIRED",
            "REM. APP.",
            "REM. PEND.",
            "TOTAL DMG",
            "TOTAL AV.",
            "GRAND TOTAL"
        ]],
        body: [[
            String(approved),
            String(repaired),
            String(remApp),
            String(remPend),
            `${totalDmg}\n(${dmgPercent}% OF TOTAL)`,
            `${totalAv}\n(${avPercent}% OF TOTAL)`,
            `${grandTotal}\n(100% OF TOTAL)`
        ]],
        startY: 128,
        margin: { left: marginX, right: marginX },
        tableWidth: usableWidth,
        theme: "grid",
        styles: {
            font: "helvetica",
            halign: "center",
            valign: "middle",
            lineColor: [195, 205, 220],
            lineWidth: 0.55,
            cellPadding: 5,
            overflow: "linebreak"
        },
        headStyles: {
            fillColor: [10, 35, 80],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7.4,
            minCellHeight: 26
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [15, 25, 35],
            fontStyle: "bold",
            fontSize: 12,
            minCellHeight: 42
        },
        columnStyles: {
            ...summaryColumnStyles,
            4: { ...summaryColumnStyles[4], textColor: [190, 35, 35] },
            5: { ...summaryColumnStyles[5], textColor: [20, 120, 50] },
            6: { ...summaryColumnStyles[6], fillColor: [10, 35, 80], textColor: [255, 255, 255] }
        },
        didParseCell: function (data) {
            if (data.section === "body" && [4, 5, 6].includes(data.column.index)) {
                data.cell.styles.fontSize = 9.5;
            }
        }
    });

    const detailsY = doc.lastAutoTable.finalY + 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(10, 35, 80);
    doc.text("DETAILS", marginX, detailsY);

    const selectedColumns = getSelectedColumns(selectedKeys);
    const { headers, body } = buildExportMatrix(rows, selectedColumns);

    const tableData = [...body];
    const selectedKeyList = selectedColumns.map(c => c.key);
    const remarksColumnIndex = selectedKeyList.indexOf("remarks");

    // Add filtered footer only when there is enough space to display it clearly.
    if (selectedColumns.length >= 3) {
        const footer = selectedColumns.map(() => "");
        footer[0] = "TOTAL (Filtered)";
        footer[Math.max(0, selectedColumns.length - 3)] = `DMG: ${counts.filteredDamage}\n(${counts.filteredDmgPercent}%)`;
        footer[Math.max(0, selectedColumns.length - 2)] = `AV: ${counts.filteredAvailable}\n(${counts.filteredAvPercent}%)`;
        footer[selectedColumns.length - 1] = `TOTAL: ${counts.filteredTotal}\n(100%)`;
        tableData.push(footer);
    }

    const minWidths = {
        no: 30,
        cntrNo: 72,
        type: 40,
        class: 48,
        status: 58,
        line: 44,
        dateIn: 60,
        daysIn: 55,
        eorDate: 62,
        daysEor: 58,
        approval: 62,
        daysApproval: 62,
        repair: 60,
        daysRepair: 62,
        dateOut: 62,
        totalDays: 60,
        today: 48,
        remarks: 120
    };

    const maxWidths = {
        no: 38,
        cntrNo: 92,
        type: 58,
        class: 72,
        status: 78,
        line: 70,
        dateIn: 82,
        daysIn: 74,
        eorDate: 82,
        daysEor: 74,
        approval: 82,
        daysApproval: 78,
        repair: 82,
        daysRepair: 78,
        dateOut: 82,
        totalDays: 74,
        today: 60,
        remarks: 260
    };

    function getTextWidthPt(text, fontSize = 7.4, isBold = false) {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        return doc.getTextWidth(String(text || ""));
    }

    function getLongestTextWidth(col, index) {
        const headerLines = String(headers[index] || "").split("\n");
        let width = Math.max(...headerLines.map(line => getTextWidthPt(line, 7.3, true)), 0) + 14;

        tableData.forEach(row => {
            const raw = String(row[index] || "").replace(/\s+/g, " ").trim();
            if (!raw) return;

            if (col.key === "remarks") {
                // Remarks can be long; give it enough room but still allow wrapping.
                const words = raw.split(" ");
                const longestWord = Math.max(...words.map(word => getTextWidthPt(word, 7.4, false)), 0);
                const previewWidth = getTextWidthPt(raw.slice(0, 55), 7.4, false);
                width = Math.max(width, Math.min(previewWidth + 18, (maxWidths[col.key] || 260)), longestWord + 18);
            } else {
                width = Math.max(width, getTextWidthPt(raw, 7.4, col.key === "cntrNo") + 16);
            }
        });

        return Math.min(Math.max(width, minWidths[col.key] || 44), maxWidths[col.key] || 90);
    }

    let calculatedWidths = selectedColumns.map((col, index) => getLongestTextWidth(col, index));
    let totalCalculatedWidth = calculatedWidths.reduce((sum, width) => sum + width, 0);

    if (totalCalculatedWidth > usableWidth) {
        const nonRemarksTotal = calculatedWidths.reduce((sum, width, i) => {
            return selectedColumns[i].key === "remarks" ? sum : sum + width;
        }, 0);
        const remarksIndex = selectedColumns.findIndex(col => col.key === "remarks");

        if (remarksIndex >= 0 && nonRemarksTotal < usableWidth) {
            calculatedWidths[remarksIndex] = Math.max(80, usableWidth - nonRemarksTotal);
            totalCalculatedWidth = calculatedWidths.reduce((sum, width) => sum + width, 0);
        }

        if (totalCalculatedWidth > usableWidth) {
            const scale = usableWidth / totalCalculatedWidth;
            calculatedWidths = calculatedWidths.map((width, i) => {
                const key = selectedColumns[i].key;
                const absoluteMin = key === "remarks" ? 70 : 26;
                return Math.max(absoluteMin, width * scale);
            });
            totalCalculatedWidth = calculatedWidths.reduce((sum, width) => sum + width, 0);
        }
    }

    const detailsTableWidth = Math.min(usableWidth, totalCalculatedWidth);
    const detailsMarginLeft = detailsTableWidth < usableWidth ? (pageWidth - detailsTableWidth) / 2 : marginX;
    const detailsMarginRight = detailsTableWidth < usableWidth ? detailsMarginLeft : marginX;

    const columnStyles = {};
    selectedColumns.forEach((col, index) => {
        columnStyles[index] = {
            cellWidth: calculatedWidths[index],
            overflow: col.key === "remarks" ? "linebreak" : "linebreak",
            halign: col.key === "remarks" ? "left" : "center",
            valign: col.key === "remarks" ? "top" : "middle",
            fontStyle: col.key === "cntrNo" ? "bold" : "normal",
            textColor: col.key === "cntrNo" ? [10, 35, 80] : [20, 25, 35]
        };
    });

    doc.autoTable({
        head: [headers],
        body: tableData,
        startY: detailsY + 14,
        theme: "grid",
        margin: { left: detailsMarginLeft, right: detailsMarginRight, bottom: 34 },
        tableWidth: detailsTableWidth,
        showHead: "everyPage",
        styles: {
            font: "helvetica",
            fontSize: selectedColumns.length > 14 ? 6.8 : 7.4,
            cellPadding: 4,
            valign: "middle",
            halign: "center",
            lineColor: [220, 226, 235],
            lineWidth: 0.45,
            textColor: [20, 25, 35],
            overflow: "hidden"
        },
        headStyles: {
            fillColor: [10, 35, 80],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            fontSize: selectedColumns.length > 14 ? 6.8 : 7.3,
            overflow: "linebreak",
            cellPadding: 4,
            minCellHeight: 28
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles,
        didParseCell: function (data) {
            const isFooter = data.row.index === tableData.length - 1 && selectedColumns.length >= 3;

            if (data.section === "body" && data.column.index === remarksColumnIndex) {
                const rawText = Array.isArray(data.cell.raw) ? data.cell.raw.join(" ") : String(data.cell.raw || "");
                data.cell.text = doc.splitTextToSize(rawText, Math.max(36, (columnStyles[data.column.index]?.cellWidth || 120) - 12));
                data.cell.styles.overflow = "linebreak";
                data.cell.styles.halign = "left";
                data.cell.styles.valign = "top";
            }

            if (data.section === "body" && data.column.index !== remarksColumnIndex) {
                const rawText = Array.isArray(data.cell.raw) ? data.cell.raw.join(" ") : String(data.cell.raw || "");
                const cleanedText = rawText.replace(/\s+/g, " ").trim();
                data.cell.text = doc.splitTextToSize(cleanedText, Math.max(24, (columnStyles[data.column.index]?.cellWidth || 50) - 10));
                data.cell.styles.overflow = "linebreak";
                data.cell.styles.halign = "center";
                data.cell.styles.valign = "middle";
            }

            if (isFooter) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [238, 244, 252];
                data.cell.styles.textColor = [10, 35, 80];
                data.cell.styles.halign = "center";
                data.cell.styles.valign = "middle";
            }
        },
        didDrawPage: function () {
            const pageNo = doc.internal.getNumberOfPages();
            doc.setDrawColor(10, 35, 80);
            doc.setLineWidth(0.8);
            doc.line(marginX, pageHeight - 28, pageWidth - marginX, pageHeight - 28);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(70, 85, 105);
            doc.text(`MNR Report  |  ${selectedLine}`, marginX, pageHeight - 14);
            doc.text(`Page ${pageNo}`, pageWidth - marginX, pageHeight - 14, { align: "right" });
        }
    });

    doc.save(`MNR_Report_${selectedLine}_${selectedCategory}_${new Date().toISOString().slice(0,10)}.pdf`);
}

window.exportExcel = exportExcel;
window.exportPDF = exportPDF;
