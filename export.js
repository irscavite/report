import { state } from "./state.js?v=20260517pdfreportdesignFINAL";

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

    const approved = toNumber(getText("dash-approved"));
    const repaired = toNumber(getText("dash-repaired"));
    const remApp = toNumber(getText("dash-rem-app"));
    const remPend = toNumber(getText("dash-rem-pend"));

    const totalDmg = toNumber(getText("dash-total-dmg"));
    const totalAv = toNumber(getText("dash-total-av"));
    const grandTotal = toNumber(getText("dash-grand-total")) || (totalDmg + totalAv);

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

    // Clean white page background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

    // Title
    doc.setTextColor(10, 35, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("MNR REPORT", pageWidth / 2, 38, { align: "center" });

    doc.setTextColor(25, 35, 50);
    doc.setFontSize(11);
    doc.text(`As of ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageWidth / 2, 58, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(90, 100, 115);
    doc.text(`Line: ${state.currentLine}   |   Category: ${state.currentCategory.toUpperCase()}   |   Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 74, { align: "center" });

    // Summary panel
    doc.setDrawColor(200, 214, 230);
    doc.setFillColor(250, 252, 255);
    doc.roundedRect(22, 92, 798, 112, 10, 10, "FD");

    const metrics = [
        { label: "APPROVED", value: approved, icon: "✓", color: [34, 145, 70] },
        { label: "REPAIRED", value: repaired, icon: "R", color: [24, 94, 165] },
        { label: "REM. APP.", value: remApp, icon: "A", color: [245, 158, 11] },
        { label: "REM. PEND.", value: remPend, icon: "P", color: [109, 67, 158] },
        { label: "TOTAL DMG", value: totalDmg, sub: `(${dmgPercent}% OF TOTAL)`, icon: "!", color: [190, 35, 35] },
        { label: "TOTAL AV.", value: totalAv, sub: `(${avPercent}% OF TOTAL)`, icon: "AV", color: [34, 145, 70] },
        { label: "GRAND TOTAL", value: grandTotal, sub: "(100% OF TOTAL)", icon: "T", color: [24, 94, 165] }
    ];

    const cardGap = 8;
    const cardW = (798 - 24 - (cardGap * 6)) / 7;
    let x = 34;
    metrics.forEach((m) => {
        drawMetricCard(doc, x, 106, cardW, 84, m);
        x += cardW + cardGap;
    });

    // Table data - NO "NO." column included
    const headers = [[
        "CNTR NO.",
        "LINE",
        "DATE IN",
        "DAYS",
        "EOR DATE",
        "DAYS",
        "APPROVAL",
        "DAYS",
        "REPAIR",
        "DAYS",
        "DATE OUT",
        "TOTAL DAYS",
        "TODAY",
        "REMARKS"
    ]];

    const tableData = rows.map(row => [
        row.cells[2]?.innerText || "",
        row.cells[3]?.innerText || "",
        row.cells[4]?.innerText || "",
        row.cells[5]?.innerText || "",
        row.cells[6]?.innerText || "",
        row.cells[7]?.innerText || "",
        row.cells[8]?.innerText || "",
        row.cells[9]?.innerText || "",
        row.cells[10]?.innerText || "",
        row.cells[11]?.innerText || "",
        row.cells[12]?.innerText || "",
        row.cells[13]?.innerText || "",
        row.cells[14]?.innerText || "",
        row.cells[15]?.innerText || ""
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
        `DMG: ${filteredDamage} (${filteredDmgPercent}%)`,
        `AV: ${filteredAvailable} (${filteredAvPercent}%)`,
        `TOTAL: ${filteredTotal} (100%)`
    ]);

    doc.autoTable({
        head: headers,
        body: tableData,
        startY: 222,
        theme: "grid",
        margin: { left: 22, right: 22 },
        tableWidth: "auto",
        styles: {
            font: "helvetica",
            fontSize: 6.2,
            cellPadding: 3.5,
            valign: "middle",
            halign: "center",
            lineColor: [220, 226, 235],
            lineWidth: 0.5,
            textColor: [20, 25, 35],
            overflow: "linebreak"
        },
        headStyles: {
            fillColor: [10, 35, 80],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            fontSize: 6.8
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 62 },
            1: { cellWidth: 34 },
            2: { cellWidth: 48 },
            3: { cellWidth: 32 },
            4: { cellWidth: 48 },
            5: { cellWidth: 32 },
            6: { cellWidth: 50 },
            7: { cellWidth: 32 },
            8: { cellWidth: 48 },
            9: { cellWidth: 32 },
            10: { cellWidth: 48 },
            11: { cellWidth: 45 },
            12: { cellWidth: 48 },
            13: { cellWidth: 103, halign: "left" }
        },
        didParseCell: function (data) {
            const isFooter = data.row.index === tableData.length - 1;
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
            }
        },
        didDrawPage: function () {
            doc.setFontSize(7);
            doc.setTextColor(120, 130, 145);
            doc.text(`MNR Report • ${state.currentLine}`, 22, 580);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, 820, 580, { align: "right" });
        }
    });

    doc.save(`MNR_Report_${state.currentLine}_${state.currentCategory}_${new Date().toISOString().slice(0,10)}.pdf`);
}

window.exportExcel = exportExcel;
window.exportPDF = exportPDF;
