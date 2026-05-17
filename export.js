import { state } from "./state.js?v=20260517flatfix2";

export function exportExcel() {
    const wb = XLSX.utils.table_to_book(document.getElementById('data-table'));
    XLSX.writeFile(wb, `MNR_${state.currentLine}_${state.currentCategory}.xlsx`);
}

export function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4');

    const approved = document.getElementById('dash-approved').innerText;
    const repaired = document.getElementById('dash-repaired').innerText;
    const remApp = document.getElementById('dash-rem-app').innerText;
    const remPend = document.getElementById('dash-rem-pend').innerText;
    const totalDmg = document.getElementById('dash-total-dmg').innerText;
    const totalAv = document.getElementById('dash-total-av').innerText;
    const grandTotal = document.getElementById('dash-grand-total').innerText;

    doc.setFontSize(18);
    doc.text(`${state.currentLine} PRODUCTIVITY REPORT`, 40, 40);

    doc.setFontSize(10);
    doc.text(`Category: ${state.currentCategory.toUpperCase()} | Date Generated: ${new Date().toLocaleString()}`, 40, 60);

    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 246);
    doc.rect(40, 75, 760, 45, 'F');

    doc.setFontSize(9);
    doc.setTextColor(44, 62, 80);
    doc.text(`APPROVED: ${approved}`, 50, 100);
    doc.text(`REPAIRED: ${repaired}`, 160, 100);
    doc.text(`REM. APP: ${remApp}`, 270, 100);
    doc.text(`REM. PEND: ${remPend}`, 380, 100);
    doc.text(`TOTAL DMG: ${totalDmg}`, 490, 100);
    doc.text(`TOTAL AV: ${totalAv}`, 600, 100);
    doc.text(`GRAND TOTAL: ${grandTotal}`, 710, 100);

    const tableData = [];
    const headers = [["NO.", "CNTR NO.", "LINE", "DATE IN", "DAYS", "EOR DATE", "DAYS", "APPROVAL", "DAYS", "REPAIR", "DAYS", "DATE OUT", "TOTAL DAYS", "TODAY", "REMARKS"]];

    const rows = document.querySelectorAll("#table-body tr");
    rows.forEach(row => {
        if (row.style.display !== 'none' && row.cells[2].innerText.trim() !== "") {
            const rowData = [
                row.cells[1].innerText,
                row.cells[2].innerText,
                row.cells[3].innerText,
                row.cells[4].innerText,
                row.cells[5].innerText,
                row.cells[6].innerText,
                row.cells[7].innerText,
                row.cells[8].innerText,
                row.cells[9].innerText,
                row.cells[10].innerText,
                row.cells[11].innerText,
                row.cells[12].innerText,
                row.cells[13].innerText,
                row.cells[14].innerText,
                row.cells[15].innerText
            ];
            tableData.push(rowData);
        }
    });

    doc.autoTable({
        head: headers,
        body: tableData,
        startY: 130,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [252, 228, 173], textColor: [0, 0, 0], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`MNR_Report_${state.currentLine}_${state.currentCategory}_${new Date().toISOString().slice(0,10)}.pdf`);
}

window.exportExcel = exportExcel;
window.exportPDF = exportPDF;
