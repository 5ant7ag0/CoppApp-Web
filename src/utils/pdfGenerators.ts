import type { jsPDF } from 'jspdf';
import type { Cooperativa } from '../context/TenantContext';

/**
 * pdfGenerators.ts
 * Utilidades para inyectar la identidad de la Cooperativa (Tenant) en los documentos imprimibles.
 */

export const drawExecutiveHeader = (
  doc: jsPDF, 
  tenant: Cooperativa | null, 
  startY: number = 20
): number => {
  const tName = tenant?.name?.toUpperCase() || 'COOPERATIVA DE AHORRO Y CRÉDITO';
  const tRuc = tenant?.ruc || '1790000000001';
  const tAddress = (tenant as any)?.address || 'Av. Principal N28-30, Matriz Principal';
  const tContact = (tenant as any)?.contact || 'Contacto: (02) 200-3000 | info@cooperativa.fin.ec';

  // LOGO (Left Side)
  if (tenant && tenant.logoBase64) {
    try {
      // Intentar extraer el tipo de imagen del base64 (ej. data:image/png;base64,...)
      let imgType = 'PNG';
      if (tenant.logoBase64.startsWith('data:image/jpeg')) imgType = 'JPEG';
      doc.addImage(tenant.logoBase64, imgType, 15, startY - 8, 20, 20, undefined, 'FAST');
    } catch (e) {
      console.warn("Could not draw logoBase64", e);
      // Fallback
      doc.setFillColor(0, 84, 166);
      doc.rect(20, startY - 8, 15, 15, 'F');
      doc.setFillColor(230, 240, 255);
      doc.rect(25, startY - 3, 5, 5, 'F');
    }
  } else {
    // For this environment, we'll draw a geometric placeholder logo since we don't have dynamic images yet
    doc.setFillColor(0, 84, 166); // #0054A6
    doc.rect(20, startY - 8, 15, 15, 'F');
    doc.setFillColor(230, 240, 255);
    doc.rect(25, startY - 3, 5, 5, 'F');
  }
  
  // METADATA (Right Aligned or Left Aligned next to logo)
  // According to plan: "doble columna: a la izquierda logotipo, y alineado a la derecha bloque de metadatos"
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightMargin = pageWidth - 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(tName, rightMargin, startY - 2, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`RUC: ${tRuc}`, rightMargin, startY + 3, { align: "right" });
  doc.text(tAddress, rightMargin, startY + 7, { align: "right" });
  doc.text(tContact, rightMargin, startY + 11, { align: "right" });

  // Draw a subtle line separator
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(20, startY + 16, rightMargin, startY + 16);

  // Return the new Y position for content to start
  return startY + 25;
};

export const drawReceiptHeader = (
  doc: jsPDF,
  tenant: Cooperativa | null,
  centerX: number = 74,
  y: number = 22
) => {
  const tName = tenant?.name?.toUpperCase() || 'COOPERATIVA DE AHORRO Y CRÉDITO';
  
  if (tenant?.logoBase64) {
    try {
      let imgType = 'PNG';
      if (tenant.logoBase64.startsWith('data:image/jpeg')) imgType = 'JPEG';
      
      const textWidth = doc.getTextWidth(tName);
      const totalWidth = 12 + 4 + textWidth; // logo (12) + gap (4) + text
      const startX = centerX - (totalWidth / 2);
      
      doc.addImage(tenant.logoBase64, imgType, startX, y - 8, 12, 12, undefined, 'FAST');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(tName, startX + 16, y, { align: "left" });
    } catch (e) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(tName, centerX, y, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(tName, centerX, y, { align: "center" });
  }
};
