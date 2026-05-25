import { state } from "./state.js?v=20260524hoverfixed";

export function exportExcel() {
    const wb = XLSX.utils.table_to_book(document.getElementById('data-table'));
    XLSX.writeFile(wb, `MNR_${state.currentLine}_${state.currentCategory}.xlsx`);
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

function drawMetricCard(doc, x, y, w, h, item) {
    doc.setDrawColor(210, 220, 235);
    doc.setFillColor(248, 251, 255);
    doc.roundedRect(x, y, w, h, 8, 8, "FD");

    // icon circle
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.circle(x + (w / 2), y + 24, 15, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(item.icon, x + (w / 2), y + 29, { align: "center" });

    doc.setTextColor(10, 35, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(item.label, x + (w / 2), y + 55, { align: "center" });

    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.setFontSize(15);
    doc.text(String(item.value), x + (w / 2), y + 75, { align: "center" });

    if (item.sub) {
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(7.5);
        doc.text(item.sub, x + (w / 2), y + 91, { align: "center" });
    }
}

export function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "pt", "a4");

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

    const rows = Array.from(document.querySelectorAll("#table-body tr"))
        .filter(row => row.style.display !== "none" && row.cells[2] && row.cells[2].innerText.trim() !== "");

    let filteredDamage = 0;
    let filteredAvailable = 0;

    rows.forEach(row => {
        const cat = row.dataset.category || "";
        if (cat === "Damage") filteredDamage++;
        else if (cat === "Available") filteredAvailable++;
        else {
            const dateOut = row.cells[12] ? row.cells[12].innerText.trim() : "";
            if (dateOut) filteredDamage++;
            else filteredAvailable++;
        }
    });

    const filteredTotal = rows.length;
    const filteredDmgPercent = percent(filteredDamage, filteredTotal);
    const filteredAvPercent = percent(filteredAvailable, filteredTotal);

    const selectedLine = state.currentLine || "ALL";
    const selectedCategory = (state.currentCategory || "ALL").toUpperCase();
    const reportTitle = `${selectedLine} REPORT`;

    // White page background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Professional header - no logo, no large icons
    doc.setTextColor(10, 35, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(reportTitle, marginX, 34);

    doc.setTextColor(30, 45, 65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Container Repair & Damage Summary", marginX, 53);

    doc.setDrawColor(10, 35, 80);
    doc.setLineWidth(2);
    doc.line(marginX, 68, pageWidth - marginX, 68);

    // Report metadata on the upper-right side
    const metaX = pageWidth - 210;
    const labelX = metaX;
    const valueX = metaX + 82;
    doc.setFontSize(9.5);
    doc.setTextColor(35, 45, 60);
    doc.setFont("helvetica", "normal");
    doc.text("Report Date", labelX, 24);
    doc.text("Line", labelX, 42);
    doc.text("Category", labelX, 60);
    doc.text("Generated", labelX, 78);
    doc.text(":", valueX - 12, 24);
    doc.text(":", valueX - 12, 42);
    doc.text(":", valueX - 12, 60);
    doc.text(":", valueX - 12, 78);
    doc.setFont("helvetica", "bold");
    doc.text(reportDateText, valueX, 24);
    doc.text(selectedLine, valueX, 42);
    doc.text(selectedCategory, valueX, 60);
    doc.text(generatedText, valueX, 78);

    // Executive summary section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(10, 35, 80);
    doc.text("EXECUTIVE SUMMARY", marginX, 100);

    const summaryHeaders = [[
        "APPROVED",
        "REPAIRED",
        "REM. APP.",
        "REM. PEND.",
        "TOTAL DMG",
        "TOTAL AV.",
        "GRAND TOTAL"
    ]];

    const summaryBody = [[
        String(approved),
        String(repaired),
        String(remApp),
        String(remPend),
        `${totalDmg}\n(${dmgPercent}% OF TOTAL)`,
        `${totalAv}\n(${avPercent}% OF TOTAL)`,
        `${grandTotal}\n(100% OF TOTAL)`
    ]];

    doc.autoTable({
        head: summaryHeaders,
        body: summaryBody,
        startY: 112,
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
            fontSize: 9.5,
            minCellHeight: 28
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [15, 25, 35],
            fontStyle: "bold",
            fontSize: 15,
            minCellHeight: 42
        },
        columnStyles: {
            4: { textColor: [190, 35, 35] },
            5: { textColor: [20, 120, 50] },
            6: { fillColor: [10, 35, 80], textColor: [255, 255, 255] }
        },
        didParseCell: function (data) {
            if (data.section === "body" && [4, 5, 6].includes(data.column.index)) {
                data.cell.styles.fontSize = 13;
            }
        }
    });

    const detailsY = doc.lastAutoTable.finalY + 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(10, 35, 80);
    doc.text("DETAILS", marginX, detailsY);

    // Table data - NO "NO." column included
    const headers = [[
        "CNTR NO.",
        "LINE",
        "DATE IN",
        "DAYS IN",
        "EOR DATE",
        "DAYS EOR",
        "APPROVAL DATE",
        "DAYS APPROVAL",
        "REPAIR DATE",
        "DAYS REPAIR",
        "DATE OUT",
        "TOTAL DAYS",
        "TODAY",
        "REMARKS"
    ]];

    const cleanSingleLine = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const cleanRemarks = (value) => String(value || "").replace(/\s+/g, " ").trim();

    const tableData = rows.map(row => [
        cleanSingleLine(row.cells[2]?.innerText),
        cleanSingleLine(row.cells[3]?.innerText),
        cleanSingleLine(row.cells[4]?.innerText),
        cleanSingleLine(row.cells[5]?.innerText),
        cleanSingleLine(row.cells[6]?.innerText),
        cleanSingleLine(row.cells[7]?.innerText),
        cleanSingleLine(row.cells[8]?.innerText),
        cleanSingleLine(row.cells[9]?.innerText),
        cleanSingleLine(row.cells[10]?.innerText),
        cleanSingleLine(row.cells[11]?.innerText),
        cleanSingleLine(row.cells[12]?.innerText),
        cleanSingleLine(row.cells[13]?.innerText),
        cleanSingleLine(row.cells[14]?.innerText),
        cleanRemarks(row.cells[15]?.innerText)
    ]);

    // Filtered total footer with percentage
    tableData.push([
        "TOTAL (Filtered)",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `DMG: ${filteredDamage}\n(${filteredDmgPercent}%)`,
        `AV: ${filteredAvailable}\n(${filteredAvPercent}%)`,
        `TOTAL: ${filteredTotal}\n(100%)`
    ]);

    doc.autoTable({
        head: headers,
        body: tableData,
        startY: detailsY + 14,
        theme: "grid",
        margin: { left: marginX, right: marginX, bottom: 34 },
        tableWidth: usableWidth,
        showHead: "everyPage",
        styles: {
            font: "helvetica",
            fontSize: 7.2,
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
            fontSize: 7.7,
            overflow: "linebreak",
            cellPadding: 4,
            minCellHeight: 28
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 70, fontStyle: "bold", textColor: [10, 35, 80], overflow: "hidden" },
            1: { cellWidth: 34, overflow: "hidden" },
            2: { cellWidth: 48, overflow: "hidden" },
            3: { cellWidth: 34, overflow: "hidden" },
            4: { cellWidth: 48, overflow: "hidden" },
            5: { cellWidth: 34, overflow: "hidden" },
            6: { cellWidth: 54, overflow: "hidden" },
            7: { cellWidth: 43, overflow: "hidden" },
            8: { cellWidth: 52, overflow: "hidden" },
            9: { cellWidth: 38, overflow: "hidden" },
            10: { cellWidth: 52, overflow: "hidden" },
            11: { cellWidth: 45, overflow: "hidden" },
            12: { cellWidth: 52, overflow: "hidden" },
            13: {
                cellWidth: 229,
                halign: "left",
                valign: "top",
                overflow: "linebreak",
                cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
                fontSize: 7.0
            }
        },
        didParseCell: function (data) {
            const isFooter = data.row.index === tableData.length - 1;

            // Force only the Remarks column to wrap inside the table.
            if (data.section === "body" && data.column.index === 13) {
                const rawText = Array.isArray(data.cell.raw) ? data.cell.raw.join(" ") : String(data.cell.raw || "");
                data.cell.text = doc.splitTextToSize(rawText, 217);
                data.cell.styles.overflow = "linebreak";
                data.cell.styles.halign = "left";
                data.cell.styles.valign = "top";
            }

            // Keep all other body columns single-line and centered.
            if (data.section === "body" && data.column.index !== 13) {
                const rawText = Array.isArray(data.cell.raw) ? data.cell.raw.join(" ") : String(data.cell.raw || "");
                data.cell.text = [rawText.replace(/\s+/g, " ").trim()];
                data.cell.styles.overflow = "hidden";
                data.cell.styles.halign = "center";
                data.cell.styles.valign = "middle";
            }

            if (isFooter) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [238, 244, 252];
                data.cell.styles.textColor = [10, 35, 80];
                if (data.column.index === 11) {
                    data.cell.styles.fillColor = [255, 228, 228];
                    data.cell.styles.textColor = [160, 20, 20];
                }
                if (data.column.index === 12) {
                    data.cell.styles.fillColor = [226, 246, 231];
                    data.cell.styles.textColor = [20, 120, 45];
                }
                if (data.column.index === 13) {
                    data.cell.styles.halign = "center";
                    data.cell.styles.valign = "middle";
                }
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
