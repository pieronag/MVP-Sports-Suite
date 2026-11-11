// Liquidación en PDF (A4) para un recinto: resumen del periodo, desglose (plan + comisión) e IVA.
// jsPDF se carga solo al exportar. La usa la pantalla de Liquidaciones (vista previa y descarga).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { listBookings } from "@/services/client/data/bookings";
import { countsAsIncome } from "@/utils/bookingModel";
import { chileDateTime } from "@/utils/chileTime";
import type { RawDoc } from "@/types/booking";

// Rango de un mes (AAAA-MM) en hora de Chile: del 1 a las 00:00 al último milisegundo del mes
export const monthRange = (ym: string) => {
    const [y, m] = (ym || '').split('-').map(Number);
    const next = new Date(Date.UTC(y, m, 1));
    const first = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, '0')}-01`;
    return { from: chileDateTime(first(y, m), 0, 0), to: new Date(chileDateTime(first(next.getUTCFullYear(), next.getUTCMonth() + 1), 0, 0).getTime() - 1) };
};

export interface Invoice {
    id: string;
    tenantId: string;
    tenant: string;
    owner: string;
    ownerEmail: string;
    rawDate: string;
    issueDate: string;
    dueDate: string;
    details: string;
    amount: number;
    status: string;
    breakdown?: any;
}

export const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
};

// jsPDF (~400 KB) se carga solo al exportar
const loadPdf = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    return { jsPDF, autoTable };
};

export async function buildInvoicePdf(inv: Invoice, globalSettings?: any) {
    const { jsPDF, autoTable } = await loadPdf();
    const docPDF = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const b = inv.breakdown || {};
    const corp = globalSettings?.corporateData || {
        razonSocial: 'ORION TECHNOLOGY SpA',
        rut: '78.392.951-1',
        direccion: 'San Pedro 1417, Rancagua',
        emailFacturacion: 'soporte@mvpsports.cl',
        giro: 'Desarrollo de Software',
        representante: 'Representante legal'
    };
    const supportEmail = globalSettings?.supportEmail || 'soporte@mvpsports.cl';
    const platformName = globalSettings?.platformName || 'MVP Sports Suite';
    const taxRate = globalSettings?.sii?.taxRate ?? 19;
    const monthName = (raw: string) => {
        const [y, m] = (raw || '2024-01').split('-').map(Number);
        const label = new Date(y || 2024, (m || 1) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    };

    // ============ DATOS DEL PERIODO ============
    const paidBookings = inv.tenantId
        ? (await listBookings([inv.tenantId], monthRange(inv.rawDate))).filter(countsAsIncome)
            .map((bk): RawDoc => ({ ...bk.raw, id: bk.id, totalPrice: bk.price, startTime: bk.startTime, date: { toDate: () => bk.start || new Date(0) } }))
        : [];
    const commRate = b.commissionRate || 0;
    const totalBookings = b.totalBookings || paidBookings.length || 0;
    const grossRevenue = b.totalRevenue || paidBookings.reduce((acc, bk) => acc + Number(bk.totalPrice || 0), 0);
    const sumComisiones = paidBookings.reduce((acc, bk) => acc + Math.round(Number(bk.totalPrice || 0) * (commRate / 100)), 0);
    const planTotal = b.planCost || 0;
    const commTotal = b.commissionTotal || sumComisiones;
    const grandTotal = planTotal + commTotal;
    const ivaFactor = taxRate / 100;
    const planNeto = Math.round(planTotal / (1 + ivaFactor));
    const planIva = planTotal - planNeto;
    const commNeto = Math.round(commTotal / (1 + ivaFactor));
    const commIva = commTotal - commNeto;
    const subTotal = planNeto + commNeto;
    const totalIva = planIva + commIva;

    // ============ ESTILO · FUENTE ÚNICA ============
    const f = (b: boolean) => docPDF.setFont('helvetica', b ? 'bold' : 'normal');
    const DARK: [number, number, number] = [15, 23, 42];
    const BODY: [number, number, number] = [51, 65, 85];
    const MUTE: [number, number, number] = [148, 163, 184];
    const GREEN: [number, number, number] = [0, 223, 130];
    const GREEN_D: [number, number, number] = [0, 150, 90];
    const AMBER: [number, number, number] = [217, 119, 6];
    const LINE: [number, number, number] = [226, 232, 240];
    const clp = (n: number) => formatCLP(n || 0);

    const fill = (c: [number, number, number]) => docPDF.setFillColor(c[0], c[1], c[2]);
    const stroke = (c: [number, number, number], w = 0.25) => { docPDF.setDrawColor(c[0], c[1], c[2]); docPDF.setLineWidth(w); };
    const hrule = (y: number, x0 = 18, x1 = 192, c: [number, number, number] = LINE, w = 0.25) => { stroke(c, w); docPDF.line(x0, y, x1, y); };
const section = (x: number, y: number, t: string) => {
        fill(GREEN);
        docPDF.circle(x + 1, y - 1.4, 1.2, 'F');
        f(true);
        docPDF.setFontSize(6.6);
        docPDF.setTextColor(DARK[0], DARK[1], DARK[2]);
        docPDF.text(t.toUpperCase(), x + 5, y, { charSpace: 0.4 });
    };
    const label = (x: number, y: number, t: string, c: [number, number, number] = MUTE) => {
        f(false);
        docPDF.setFontSize(5.6);
        docPDF.setTextColor(c[0], c[1], c[2]);
        docPDF.text(t.toUpperCase(), x, y, { charSpace: 0.3 });
    };
    const estadoColor = inv.status === 'Pagada' ? GREEN_D : AMBER;
    // estilos de tabla compartidos
const TH = { fillColor: [255, 255, 255] as [number, number, number], textColor: [148, 163, 184] as [number, number, number], fontStyle: 'bold' as const, fontSize: 5.6, lineWidth: 0.3, lineColor: [226, 232, 240] as [number, number, number] };
    const TD = { fontSize: 6.4, cellPadding: 2.6, textColor: [51, 65, 85] as [number, number, number], lineColor: [241, 245, 249] as [number, number, number], lineWidth: 0.15 };

    const metodoPago = (book: any): string => {
        const m = (book.paymentMethod || '').toLowerCase();
        const s = (book.source || '').toLowerCase();
        if (m === 'card' || m === 'webpay') return 'WEBPAY';
        if (m === 'oneclick') return 'ONECLICK';
        if (m === 'cash' || m === 'efectivo') return 'EFECTIVO';
        if (m === 'transfer' || m === 'transferencia') return 'TRANSFERENCIA';
        if (s === 'mobile_app') return 'ONLINE APP';
        if (s === 'manual' || s === 'web_dashboard') return 'MANUAL';
        return '—';
    };

    // ============ PÁGINA 1 · RESUMEN ============
    // header
    fill(GREEN);
    docPDF.rect(0, 0, 210, 2, 'F');
    fill(DARK);
    docPDF.rect(0, 2, 210, 40, 'F');
    fill(GREEN);
    docPDF.rect(0, 42, 210, 0.8, 'F');

    try {
        docPDF.addImage('/Logo.png', 'PNG', 15, 8, 30, 30);
    } catch {
        f(true);
        docPDF.setFontSize(12);
        docPDF.setTextColor(GREEN_D[0], GREEN_D[1], GREEN_D[2]);
        docPDF.text('M', 25, 30);
    }
f(true);
    docPDF.setFontSize(16);
    const wMVP = docPDF.getTextWidth('MVP');
    docPDF.setTextColor(255, 255, 255);
    docPDF.text('MVP', 50, 19);
    docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    docPDF.text('SPORTS', 50 + wMVP + 1.5, 19);
    f(false);
    docPDF.setFontSize(5.4);
    docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    docPDF.text(platformName.toUpperCase(), 50, 23, { charSpace: 0.5 });
    f(true);
    docPDF.setFontSize(10);
    docPDF.setTextColor(255, 255, 255);
    docPDF.text('LIQUIDACIÓN DE SERVICIOS', 50, 30);
    f(false);
    docPDF.setFontSize(5);
    docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    docPDF.text('DOCUMENTO DE COBRO · POST PAGO', 50, 33.5, { charSpace: 0.3 });

    // folio (alineado a la derecha)
    f(false);
    docPDF.setFontSize(5.6);
    docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    docPDF.text('LIQUIDACIÓN N°', 195, 13, { align: 'right' });
    f(true);
    docPDF.setFontSize(14);
    docPDF.setTextColor(255, 255, 255);
    docPDF.text(inv.id.slice(0, 8).toUpperCase(), 195, 20, { align: 'right' });
    stroke(GREEN, 0.3);
    docPDF.line(145, 23, 195, 23);
    f(false);
    docPDF.setFontSize(5.6);
    docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    docPDF.text('POST PAGO', 195, 28, { align: 'right' });
    docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    docPDF.text('PERIODO ' + monthName(inv.rawDate), 195, 33, { align: 'right' });

    // ============ META (tabla) ============
    autoTable(docPDF, {
        startY: 48,
        head: [['FECHA DE EMISIÓN', 'FECHA DE VENCIMIENTO', 'PERIODO FACTURADO', 'ESTADO']],
        body: [[inv.issueDate, inv.dueDate, monthName(inv.rawDate), inv.status.toUpperCase()]],
        theme: 'plain',
        headStyles: TH,
        styles: TD,
        columnStyles: { 3: { fontStyle: 'bold', textColor: [estadoColor[0], estadoColor[1], estadoColor[2]] } }
    });

// ============ EMISOR (línea compacta) + DATOS DEL CLIENTE ============
    const emY = (docPDF as any).lastAutoTable.finalY + 10;
    f(false);
    docPDF.setFontSize(5.6);
    docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    docPDF.text('EMISOR · ' + corp.razonSocial.toUpperCase() + ' · RUT ' + corp.rut, 18, emY);
    docPDF.text(corp.giro + ' · ' + corp.direccion + ' · ' + corp.emailFacturacion, 18, emY + 4);
    hrule(emY + 7);

    section(18, emY + 15, 'Datos del cliente');
    autoTable(docPDF, {
        startY: emY + 19,
        head: [['CAMPO', 'VALOR']],
        body: [
            ['Recinto', inv.tenant],
            ['Representante', inv.owner],
            ['Email', inv.ownerEmail || '—'],
            ['Plan contratado', b.planName || 'Base'],
            ['Comisión del plan', (commRate || 0) + '%'],
        ],
        theme: 'plain',
        headStyles: TH,
        styles: TD,
        columnStyles: {
            0: { fontStyle: 'bold', textColor: [100, 116, 139], cellPadding: 2.6 },
            1: { fontStyle: 'bold', textColor: [15, 23, 42] }
        }
    });

    // ============ INDICADORES (tabla) ============
    section(18, (docPDF as any).lastAutoTable.finalY + 10, 'Indicadores del periodo');
    autoTable(docPDF, {
        startY: (docPDF as any).lastAutoTable.finalY + 14,
        head: [['RESERVAS PAGADAS', 'INGRESO BRUTO', 'PLAN MENSUAL', 'COMISIÓN APLICADA']],
        body: [[String(totalBookings), clp(grossRevenue), clp(planTotal), clp(commTotal)]],
        theme: 'plain',
        headStyles: TH,
        styles: { ...TD, fontSize: 8.4, cellPadding: 3.4 },
        columnStyles: { 2: { fontStyle: 'bold', textColor: [0, 150, 90] }, 3: { fontStyle: 'bold', textColor: [0, 150, 90] } }
    });

    // ============ SERVICIOS (tabla) ============
    section(18, (docPDF as any).lastAutoTable.finalY + 10, 'Servicios del periodo');
    autoTable(docPDF, {
        startY: (docPDF as any).lastAutoTable.finalY + 14,
        head: [['ÍTEM', 'DESCRIPCIÓN', 'DETALLE', 'CANT', 'TOTAL']],
        body: [
            ['01', 'Suscripción mensual MVP', 'Plan ' + (b.planName || 'Base') + ' · costo fijo', '1', clp(planTotal)],
            ['02', 'Comisiones por reservas pagadas', (commRate || 0) + '% sobre ' + totalBookings + ' reservas', String(totalBookings), clp(commTotal)],
        ],
        theme: 'plain',
        headStyles: TH,
        styles: TD,
        columnStyles: {
            0: { fontStyle: 'bold', textColor: [0, 150, 90] },
            1: { fontStyle: 'bold', textColor: [15, 23, 42] },
            3: { halign: 'center' },
            4: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
        }
    });

    // ============ TOTALES ============
    const totY = (docPDF as any).lastAutoTable.finalY + 10;
    const tX = 112;
    const totRow = (y: number, l: string, v: string, c: [number, number, number] = BODY) => {
        f(false);
        docPDF.setFontSize(6.4);
        docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
        docPDF.text(l, tX, y);
        f(true);
        docPDF.setFontSize(7.2);
        docPDF.setTextColor(c[0], c[1], c[2]);
        docPDF.text(v, 192, y, { align: 'right' });
    };

    totRow(totY, 'Neto plan', clp(planNeto));
    totRow(totY + 5.5, 'IVA ' + taxRate + '% plan', clp(planIva));
    totRow(totY + 11, 'Neto comisiones', clp(commNeto));
    totRow(totY + 16.5, 'IVA ' + taxRate + '% comisiones', clp(commIva));
    hrule(totY + 20, tX, 192, DARK, 0.4);
    f(true);
    docPDF.setFontSize(7.6);
    docPDF.setTextColor(DARK[0], DARK[1], DARK[2]);
    docPDF.text('SUB TOTAL', tX, totY + 25);
    docPDF.text(clp(subTotal), 192, totY + 25, { align: 'right' });

fill(DARK);
    docPDF.roundedRect(tX, totY + 30, 80, 15, 5, 5, 'F');
f(true);
    docPDF.setFontSize(7.2);
    docPDF.setTextColor(255, 255, 255);
    docPDF.text('TOTAL A PAGAR', tX + 7, totY + 38);
    f(true);
    docPDF.setFontSize(11.5);
    docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    docPDF.text(clp(grandTotal), tX + 73, totY + 38.5, { align: 'right' });

    // info de pago
    const payY = totY + 53;
    section(18, payY, 'Información de pago');
    f(false);
    docPDF.setFontSize(6.4);
    docPDF.setTextColor(BODY[0], BODY[1], BODY[2]);
    docPDF.text('Los fondos recaudados por reservas pagadas en línea ingresan directamente a la cuenta del recinto. Liquidación post-pago.', 18, payY + 5);
    docPDF.text('Plazo de pago de 5 a 10 días corridos desde la emisión. Ante dudas contacta a ' + supportEmail + '.', 18, payY + 9.5);

    // footer página 1
    const p1H = docPDF.internal.pageSize.getHeight();
    fill(DARK);
    docPDF.rect(0, p1H - 9, 210, 9, 'F');
    fill(GREEN);
    docPDF.rect(0, p1H - 9, 210, 0.8, 'F');
    f(false);
    docPDF.setFontSize(5.6);
    docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    docPDF.text(corp.razonSocial + ' · RUT ' + corp.rut + ' · ' + corp.emailFacturacion, 10, p1H - 2.5);
    f(true);
    docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
    docPDF.text('01', 200, p1H - 2.5, { align: 'right' });

    // ============ PÁGINA 2+ · HISTORIAL COMPLETO ============
    docPDF.addPage();

    const dailyRows = paidBookings.map(book => {
        const bDate = book.date?.toDate ? book.date.toDate() : (book.date?.seconds ? new Date(book.date.seconds * 1000) : null);
        const price = Number(book.totalPrice || 0);
        const comm = Math.round(price * (commRate / 100));
        const timeRaw = book.startTime;
        const time = typeof timeRaw === 'string' && timeRaw.includes(':')
            ? timeRaw
            : bDate ? `${String(bDate.getHours()).padStart(2, '0')}:${String(bDate.getMinutes()).padStart(2, '0')}` : '--:--';
        const code = book.transactionId || book.bookingId || (book.id ? `#${book.id.slice(0, 5)}` : '—');
        return [
            `${bDate?.toLocaleDateString('es-CL') || '-'} ${time}`,
            code.toUpperCase().slice(0, 12),
            book.customerName?.toUpperCase() || 'JUGADOR APP',
            `${book.sport?.toUpperCase() || 'FÚTBOL'} / ${book.courtName?.toUpperCase() || 'PISTA'}`,
            metodoPago(book),
            clp(price),
            `${commRate}%`,
            clp(comm)
        ];
    });

    section(18, 24, 'Historial de reservas pagadas');
    label(23, 30, monthName(inv.rawDate) + ' · ' + inv.tenant.toUpperCase() + ' · ' + totalBookings + ' reserva(s)');
    hrule(34);

    autoTable(docPDF, {
        startY: 39,
        head: [['FECHA / HORA', 'CÓDIGO', 'CLIENTE', 'DEPORTE / CANCHA', 'MÉTODO', 'MONTO', '%', 'COMISIÓN']],
        body: dailyRows.length > 0 ? dailyRows : [['Sin reservas pagadas en el periodo', '-', '-', '-', '-', '-', '-', '-']],
        foot: dailyRows.length > 0 ? [['', '', 'TOTAL DEL MES', '', '', clp(grossRevenue), '', clp(sumComisiones)]] : undefined,
        theme: 'plain',
        headStyles: TH,
        footStyles: { fillColor: [15, 23, 42], textColor: [0, 223, 130], fontStyle: 'bold', fontSize: 6, lineWidth: 0 },
        styles: { fontSize: 5.8, cellPadding: 2, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.15 },
        columnStyles: {
            5: { halign: 'right' },
            6: { halign: 'center' },
            7: { halign: 'right', fontStyle: 'bold', textColor: [0, 150, 90] }
        },
        didDrawPage: (data) => {
            const pageH = docPDF.internal.pageSize.getHeight();
            fill(DARK);
            docPDF.rect(0, 0, 210, 7, 'F');
            fill(GREEN);
            docPDF.rect(0, 7, 210, 0.6, 'F');
            f(true);
            docPDF.setFontSize(6.5);
            docPDF.setTextColor(255, 255, 255);
            docPDF.text('MVP SPORTS', 18, 5);
            f(false);
            docPDF.setFontSize(5.4);
            docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
            docPDF.text(monthName(inv.rawDate), 195, 5, { align: 'right' });
            fill(DARK);
            docPDF.rect(0, pageH - 9, 210, 9, 'F');
            fill(GREEN);
            docPDF.rect(0, pageH - 9, 210, 0.8, 'F');
            f(false);
            docPDF.setFontSize(5.6);
            docPDF.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
            docPDF.text(corp.razonSocial + ' · RUT ' + corp.rut, 10, pageH - 2.5);
            f(true);
            docPDF.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
            docPDF.text(String(data.pageNumber).padStart(2, '0'), 200, pageH - 2.5, { align: 'right' });
        }
    });

    return docPDF;
}
