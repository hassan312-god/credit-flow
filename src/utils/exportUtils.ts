import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Exporte des données en format PDF
 */
export const exportToPDF = (
  data: any[],
  headers: string[],
  filename: string,
  title: string = 'Rapport'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const startY = 30;
  let y = startY;

  // Titre
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 10;

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, margin, y);
  y += 10;

  // Tableau
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  const colWidths = headers.map(() => (pageWidth - 2 * margin) / headers.length);
  const rowHeight = 8;

  // En-têtes
  doc.setFillColor(31, 58, 95); // Couleur primaire
  doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  
  headers.forEach((header, i) => {
    doc.text(header, margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 2, y + 5);
  });
  y += rowHeight;

  // Données
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  
  data.forEach((row, rowIndex) => {
    // Nouvelle page si nécessaire
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }

    // Alternance de couleurs pour les lignes
    if (rowIndex % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F');
    }

    const rowData = Array.isArray(row) ? row : headers.map(h => row[h] || '');
    rowData.forEach((cell: any, i: number) => {
      const cellText = String(cell || '').substring(0, 30); // Limiter la longueur
      doc.text(cellText, margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 2, y + 5);
    });
    y += rowHeight;
  });

  // Sauvegarder
  doc.save(`${filename}.pdf`);
};

/**
 * Exporte des données en format XLSX (Excel)
 */
export const exportToXLSX = (
  data: any[],
  headers: string[],
  filename: string,
  sheetName: string = 'Données'
) => {
  // Préparer les données
  const worksheetData = [
    headers,
    ...data.map(row => {
      if (Array.isArray(row)) {
        return row;
      }
      return headers.map(h => row[h] || '');
    }),
  ];

  // Créer le workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Ajuster la largeur des colonnes
  const colWidths = headers.map((_, i) => {
    const maxLength = Math.max(
      headers[i].length,
      ...data.map(row => {
        const cell = Array.isArray(row) ? row[i] : row[headers[i]];
        return String(cell || '').length;
      })
    );
    return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  // Style de l'en-tête
  const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F3A5F' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Ajouter la feuille au workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Sauvegarder
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Exporte des données en CSV (pour compatibilité)
 */
export const exportToCSV = (
  data: any[],
  headers: string[],
  filename: string
) => {
  const rows = data.map(row => {
    if (Array.isArray(row)) {
      return row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`);
    }
    return headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`);
  });

  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

