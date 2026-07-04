import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const anyTenant = tenant as any;
  const tName = (tenant?.name || anyTenant?.nombre || 'COOPERATIVA DE AHORRO Y CRÉDITO').toUpperCase();
  const tRuc = tenant?.ruc || '1790000000001';
  const tAddress = anyTenant?.address || anyTenant?.direccion || 'Av. Principal N28-30, Matriz Principal';
  const tel = anyTenant?.telefono || '';
  const email = anyTenant?.correo || '';
  const fallbackContact = 'Contacto: (02) 200-3000 | info@cooperativa.fin.ec';
  const tContact = anyTenant?.contact || (tel || email ? `Contacto: ${tel} ${tel && email ? '|' : ''} ${email}`.trim() : fallbackContact);

  // LOGO (Left Side)
  if (tenant && tenant.logoBase64) {
    try {
      let imgType: string | undefined = undefined;
      const base64Upper = tenant.logoBase64.toUpperCase();
      if (base64Upper.includes('IMAGE/JPEG') || base64Upper.includes('IMAGE/JPG')) imgType = 'JPEG';
      else if (base64Upper.includes('IMAGE/PNG')) imgType = 'PNG';
      else if (base64Upper.includes('IMAGE/WEBP')) imgType = 'WEBP';
      
      // If we couldn't detect from mime type, we let jsPDF auto-detect from base64 signature by passing undefined
      doc.addImage(tenant.logoBase64, imgType as any, 15, startY - 8, 20, 20, undefined, 'FAST');
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
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const textWidth = doc.getTextWidth(tName);
      
      const totalWidth = 12 + 4 + textWidth; // logo (12) + gap (4) + text
      const startX = centerX - (totalWidth / 2);
      
      doc.addImage(tenant.logoBase64, imgType, startX, y - 8, 12, 12, undefined, 'FAST');
      
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(tName, startX + 16, y, { align: "left" });
    } catch (e) {
      console.warn("Could not draw receipt logo", e);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(tName, centerX, y, { align: "center" });
  }
};

/**
 * Motor Universal de Impresión de Tablas de Amortización.
 * Garantiza consistencia visual, diseño premium (DRY) y cumplimiento normativo.
 */
export const generarPdfTablaAmortizacionUniversal = (
  cred: any,
  socio: any,
  cuotas: any[],
  activeTenant: Cooperativa | null,
  emisor: string = "Canal Digital"
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 15;
  const pageWidth = 210;
  let currentY = drawExecutiveHeader(doc, activeTenant, 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 26);
  doc.text("TABLA DE AMORTIZACIÓN", margin, currentY);

  currentY += 3;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // Rastro de Auditoría Superior
  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  const fechaImpresion = new Date().toLocaleString('es-EC');
  doc.text(`Generado: ${fechaImpresion} | Emisor: ${emisor}`, margin, currentY);

  // Detalles del Socio y Crédito
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 84, 166);
  doc.text("DETALLES DEL SOCIO Y CRÉDITO", margin, currentY);
  currentY += 2;
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;
  
  const drawRow = (l1: string, v1: string, l2: string, v2: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(l1 + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(26, 26, 26);
    doc.text(v1, margin + 30, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(l2 + ":", 110, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(26, 26, 26);
    doc.text(v2, 110 + 32, y);
  };

  // Safe checks for object properties
  const nombreSocio = socio?.nombresCompletos || cred?.socio?.nombresCompletos || 'Consumidor Final';
  const idSocio = socio?.identificacion || cred?.socio?.identificacion || '9999999999';
  const fechaSol = cred?.fechaSolicitud ? new Date(cred.fechaSolicitud).toLocaleDateString('es-EC') : 'N/A';
  const plazo = cred?.plazoMeses || cred?.plazo || 0;
  
  const totalCapitalPagado = cuotas ? cuotas.reduce((sum: number, cuota: any) => sum + parseFloat(cuota.capitalPagado || 0), 0) : 0;
  const montoDesemb = parseFloat(cred?.montoDesembolsado || cred?.montoSolicitado || cred?.monto || 0);
  const saldoDeudor = (cred?.estado === 'DESEMBOLSADO' || cred?.estado === 'EN_MORA')
    ? Math.max(0, montoDesemb - totalCapitalPagado)
    : 0;
    
  const tipoAmortizacion = cred?.tipoAmortizacion || 'FRANCES';
  const tasaInteres = parseFloat(cred?.tasaInteresAnual || cred?.tasaInteres || 0).toFixed(2);
  const estadoCredito = cred?.estado || 'DESCONOCIDO';
  
  // Custom charges
  const cargosAdicionales = parseFloat(cred?.cargosAdicionales || cred?.seguroDesgravamen || 0);
  const textCargos = cargosAdicionales > 0 ? `$${cargosAdicionales.toFixed(2)}` : 'N/A';

  drawRow("Socio", nombreSocio, "Identificación", idSocio, currentY);
  currentY += 5;
  drawRow("Nº Crédito", cred?.numeroCredito || cred?.id?.toString() || 'S/N', "Fecha Solicitud", fechaSol, currentY);
  currentY += 5;
  drawRow("Monto Aprobado", `$${montoDesemb.toFixed(2)}`, "Plazo", `${plazo} meses`, currentY);
  currentY += 5;
  drawRow("Saldo Deudor", `$${saldoDeudor.toFixed(2)}`, "Tipo Amortización", tipoAmortizacion, currentY);
  currentY += 5;
  drawRow("Tasa Interés", `${tasaInteres}% Anual`, "Estado Crédito", estadoCredito, currentY);
  
  // Muestra cargos extra si los hay
  if (cargosAdicionales > 0) {
    currentY += 5;
    drawRow("Cargos/Seguro", textCargos, "Oficial", emisor, currentY);
  } else {
    currentY += 5;
    drawRow("Oficial Emisor", emisor, "", "", currentY);
  }

  currentY += 8;

  // Build amortization table body
  let runningBalance = montoDesemb;
  const cuotasOrdenadas = cuotas && cuotas.length > 0 ? [...cuotas].sort((a, b) => (a.numeroCuota || a.num) - (b.numeroCuota || b.num)).map((cuota) => {
    const capProy = parseFloat(cuota.capitalProyectado || cuota.capital || 0);
    runningBalance = runningBalance - capProy;
    return {
      ...cuota,
      saldoRestante: Math.max(0, runningBalance)
    };
  }) : [];

  const tableBody = cuotasOrdenadas.map((cuota: any) => {
    const num = cuota.numeroCuota || cuota.num;
    const fecha = cuota.fechaVencimiento || cuota.fecha;
    const cap = parseFloat(cuota.capitalProyectado || cuota.capital || 0);
    const inter = parseFloat(cuota.interesProyectado || cuota.interes || 0);
    const totalC = parseFloat(cuota.cuotaTotalProyectada || cuota.total || (cap + inter));
    const saldoR = cuota.saldoRestante;
    let est = cuota.estado || 'PENDIENTE';
    if (['PAGADA', 'CANCELADA', 'CANCELADO'].includes(est)) {
      est = 'LIQUIDADO';
    } else if (['MORA', 'EN_MORA'].includes(est)) {
      est = 'EN MORA';
    }

    return [
      `Cuota #${num}`,
      fecha ? new Date(fecha).toLocaleDateString('es-EC') : 'N/A',
      `$${cap.toFixed(2)}`,
      `$${inter.toFixed(2)}`,
      `$${totalC.toFixed(2)}`,
      `$${saldoR.toFixed(2)}`,
      est
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Total Cuota', 'Saldo Restante', 'Estado']],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [0, 84, 166],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    didDrawPage: (data) => {
      currentY = data.cursor ? data.cursor.y : currentY + 15;
    }
  });

  // Firmas y Rastro de Auditoría Inferior
  currentY += 30;
  if (currentY > 250) {
    doc.addPage();
    currentY = 40;
  }

  // Líneas de firma
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);
  doc.line(margin + 10, currentY, margin + 60, currentY); // Firma Institución
  doc.line(pageWidth - margin - 60, currentY, pageWidth - margin - 10, currentY); // Firma Cliente

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  
  doc.text("Firma Autorizada", margin + 35, currentY + 5, { align: 'center' });
  doc.text(activeTenant?.name || "LA INSTITUCIÓN", margin + 35, currentY + 9, { align: 'center' });
  
  doc.text("Firma del Cliente / Socio", pageWidth - margin - 35, currentY + 5, { align: 'center' });
  doc.text(`C.I. ${idSocio}`, pageWidth - margin - 35, currentY + 9, { align: 'center' });

  // Legal Notice
  currentY += 20;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Este documento es una copia digital oficial de la tabla de amortización correspondiente al crédito indicado.", margin, currentY);
  doc.text(`Impreso el ${fechaImpresion} por ${emisor}. Documento generado automáticamente.`, margin, currentY + 4);

  const safeNum = cred?.numeroCredito || cred?.id || 'SN';
  doc.save(`tabla_amortizacion_${safeNum}.pdf`);
};
