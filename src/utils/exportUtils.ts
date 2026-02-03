import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
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
 * Exporte des données en format XLSX (Excel) using ExcelJS
 */
export const exportToXLSX = async (
  data: any[],
  headers: string[],
  filename: string,
  sheetName: string = 'Données'
) => {
  // Créer le workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'N\'FA KA SÉRUM';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet(sheetName);

  // Ajouter les en-têtes
  worksheet.addRow(headers);

  // Ajouter les données
  data.forEach(row => {
    const rowData = Array.isArray(row) ? row : headers.map(h => row[h] || '');
    worksheet.addRow(rowData);
  });

  // Style de l'en-tête (première ligne)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F3A5F' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 20;

  // Ajuster la largeur des colonnes
  headers.forEach((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...data.map(row => {
        const cell = Array.isArray(row) ? row[i] : row[header];
        return String(cell || '').length;
      })
    );
    const column = worksheet.getColumn(i + 1);
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  // Style alterné pour les lignes de données
  for (let i = 2; i <= data.length + 1; i++) {
    const row = worksheet.getRow(i);
    if (i % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' }
      };
    }
    row.alignment = { vertical: 'middle' };
  }

  // Générer le fichier et télécharger
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xlsx`;
  link.click();
  
  // Nettoyer l'URL
  URL.revokeObjectURL(link.href);
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
