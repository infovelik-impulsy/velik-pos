import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { DailySalesData, ProfessionalMetrics, ServiceMetric, PaymentBreakdown } from './billing-queries'

interface ExportData {
  dateRange: { desde: string; hasta: string }
  metrics: {
    totalIncome: number
    totalComisiones: number
    transactionCount: number
    averageTransaction: number
  }
  dailySales: DailySalesData[]
  professionals: ProfessionalMetrics[]
  topServices: ServiceMetric[]
  paymentBreakdown: PaymentBreakdown
}

export async function exportToExcel(data: ExportData, fileName: string) {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summaryData: any[] = [
    ['RESUMEN DE FACTURACIÓN'],
    [],
    ['Período', `${data.dateRange.desde} a ${data.dateRange.hasta}`],
    ['Ingresos Totales', data.metrics.totalIncome],
    ['Comisiones Profesionales', data.metrics.totalComisiones],
    ['Total Transacciones', data.metrics.transactionCount],
    ['Ticket Promedio', data.metrics.averageTransaction],
  ]

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

  // Sheet 2: Daily breakdown
  const dailyData: any[] = [['Fecha', 'Total', 'Efectivo', 'Digital', 'Transacciones']]
  data.dailySales.forEach(day => {
    dailyData.push([day.fecha, day.total, day.efectivo, day.digital, day.count])
  })
  const dailySheet = XLSX.utils.aoa_to_sheet(dailyData)
  XLSX.utils.book_append_sheet(workbook, dailySheet, 'Diario')

  // Sheet 3: By professional
  const profData: any[] = [['Profesional', 'Servicios', 'Total Ventas', 'Comisión Profesional', 'Parte Velik']]
  data.professionals.forEach(prof => {
    profData.push([prof.nombre, prof.servicios_count, prof.total, prof.comision, prof.comision_velik])
  })
  // Totals row
  profData.push([
    'TOTAL',
    data.professionals.reduce((s, p) => s + p.servicios_count, 0),
    data.professionals.reduce((s, p) => s + p.total, 0),
    data.professionals.reduce((s, p) => s + p.comision, 0),
    data.professionals.reduce((s, p) => s + p.comision_velik, 0),
  ])
  const profSheet = XLSX.utils.aoa_to_sheet(profData)
  XLSX.utils.book_append_sheet(workbook, profSheet, 'Profesionales')

  // Sheet 4: Top services
  const servData: any[] = [['Servicio', 'Cantidad', 'Ingresos', '%']]
  const totalRevenue = data.topServices.reduce((sum, s) => sum + s.revenue, 0)
  data.topServices.forEach(serv => {
    const percentage = totalRevenue > 0 ? ((serv.revenue / totalRevenue) * 100).toFixed(1) : '0'
    servData.push([serv.nombre, serv.count, serv.revenue, percentage])
  })
  const servSheet = XLSX.utils.aoa_to_sheet(servData)
  XLSX.utils.book_append_sheet(workbook, servSheet, 'Servicios')

  // Sheet 5: Payment methods
  const payData: any[] = [
    ['Método de Pago', 'Total', 'Transacciones', '%'],
    ['Efectivo', data.paymentBreakdown.efectivo, '', ''],
    ['Transferencia', data.paymentBreakdown.transferencia, '', ''],
    ['Tarjeta', data.paymentBreakdown.tarjeta, '', ''],
    ['Mixto', data.paymentBreakdown.mixto, '', ''],
    [],
    ['TOTAL', data.paymentBreakdown.total_dinero, data.paymentBreakdown.total_transacciones, ''],
  ]
  const paySheet = XLSX.utils.aoa_to_sheet(payData)
  XLSX.utils.book_append_sheet(workbook, paySheet, 'Métodos de Pago')

  // Save file
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

export async function exportToPDF(
  _elementId: string,
  fileName: string,
  dateRange: { desde: string; hasta: string },
  exportData?: {
    metrics: { totalIncome: number; totalComisiones: number; transactionCount: number; averageTransaction: number }
    professionals: ProfessionalMetrics[]
    topServices: ServiceMetric[]
    paymentBreakdown: PaymentBreakdown
    dailySales: DailySalesData[]
  }
) {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const W = 210
    const margin = 15
    let y = 20

    const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO')

    // ── Header ─────────────────────────────────────────────────────────────
    pdf.setFillColor(26, 26, 26)
    pdf.rect(0, 0, W, 28, 'F')
    pdf.setTextColor(201, 168, 76)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('VELIK BEAUTY HOUSE', margin, 12)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(200, 200, 200)
    pdf.text('Reporte de Facturación', margin, 19)
    pdf.text(`Período: ${dateRange.desde}  →  ${dateRange.hasta}`, margin, 25)
    pdf.setTextColor(150, 150, 150)
    pdf.text(`Generado: ${new Date().toLocaleString('es-CO')}`, W - margin, 25, { align: 'right' })

    y = 38
    pdf.setTextColor(30, 30, 30)

    if (exportData) {
      const { metrics, professionals, topServices, paymentBreakdown } = exportData

      // ── KPI Cards ──────────────────────────────────────────────────────
      const kpis = [
        { label: 'Ingresos Totales', value: fmt(metrics.totalIncome) },
        { label: 'Comisiones Prof.', value: fmt(metrics.totalComisiones) },
        { label: 'Transacciones', value: String(metrics.transactionCount) },
        { label: 'Ticket Promedio', value: fmt(metrics.averageTransaction) },
      ]
      const cardW = (W - margin * 2 - 9) / 4
      kpis.forEach((kpi, i) => {
        const x = margin + i * (cardW + 3)
        pdf.setFillColor(249, 246, 238)
        pdf.roundedRect(x, y, cardW, 18, 2, 2, 'F')
        pdf.setFontSize(7)
        pdf.setTextColor(138, 122, 106)
        pdf.setFont('helvetica', 'normal')
        pdf.text(kpi.label.toUpperCase(), x + cardW / 2, y + 6, { align: 'center' })
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(201, 168, 76)
        pdf.text(kpi.value, x + cardW / 2, y + 13, { align: 'center' })
      })
      y += 26

      // ── Profesionales ──────────────────────────────────────────────────
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(26, 26, 26)
      pdf.text('Desglose por Profesional', margin, y)
      y += 6

      // Table header
      pdf.setFillColor(26, 26, 26)
      pdf.rect(margin, y, W - margin * 2, 7, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      const cols = [margin + 2, 80, 115, 150, 180]
      pdf.text('Profesional', cols[0], y + 5)
      pdf.text('Servicios', cols[1], y + 5, { align: 'right' })
      pdf.text('Total Ventas', cols[2], y + 5, { align: 'right' })
      pdf.text('Comisión Prof.', cols[3], y + 5, { align: 'right' })
      pdf.text('Velik', cols[4], y + 5, { align: 'right' })
      y += 7

      professionals.forEach((prof, i) => {
        if (i % 2 === 0) { pdf.setFillColor(249, 249, 249); pdf.rect(margin, y, W - margin * 2, 7, 'F') }
        pdf.setTextColor(30, 30, 30)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text(prof.nombre, cols[0], y + 5)
        pdf.text(String(prof.servicios_count), cols[1], y + 5, { align: 'right' })
        pdf.text(fmt(prof.total), cols[2], y + 5, { align: 'right' })
        pdf.setTextColor(201, 168, 76)
        pdf.text(fmt(prof.comision), cols[3], y + 5, { align: 'right' })
        pdf.setTextColor(30, 30, 30)
        pdf.text(fmt(prof.comision_velik), cols[4], y + 5, { align: 'right' })
        y += 7
      })

      // Totals row
      pdf.setFillColor(201, 168, 76)
      pdf.rect(margin, y, W - margin * 2, 7, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.text('TOTAL', cols[0], y + 5)
      pdf.text(String(professionals.reduce((s, p) => s + p.servicios_count, 0)), cols[1], y + 5, { align: 'right' })
      pdf.text(fmt(professionals.reduce((s, p) => s + p.total, 0)), cols[2], y + 5, { align: 'right' })
      pdf.text(fmt(professionals.reduce((s, p) => s + p.comision, 0)), cols[3], y + 5, { align: 'right' })
      pdf.text(fmt(professionals.reduce((s, p) => s + p.comision_velik, 0)), cols[4], y + 5, { align: 'right' })
      y += 14

      // ── Métodos de Pago ────────────────────────────────────────────────
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(26, 26, 26)
      pdf.text('Métodos de Pago', margin, y)
      y += 6

      const metodos = [
        { label: 'Efectivo', value: paymentBreakdown.efectivo },
        { label: 'Transferencia / Wompi', value: paymentBreakdown.transferencia },
        { label: 'Tarjeta / Datáfono', value: paymentBreakdown.tarjeta },
        { label: 'Mixto', value: paymentBreakdown.mixto },
        { label: 'De la casa', value: paymentBreakdown.de_la_casa },
      ]
      metodos.forEach((m, i) => {
        if (i % 2 === 0) { pdf.setFillColor(249, 249, 249); pdf.rect(margin, y, W - margin * 2, 7, 'F') }
        pdf.setTextColor(30, 30, 30)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text(m.label, cols[0], y + 5)
        pdf.text(fmt(m.value), cols[2], y + 5, { align: 'right' })
        y += 7
      })
      y += 7

      // ── Top Servicios ──────────────────────────────────────────────────
      if (y > 240) { pdf.addPage(); y = 20 }

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(26, 26, 26)
      pdf.text('Servicios Más Vendidos', margin, y)
      y += 6

      pdf.setFillColor(26, 26, 26)
      pdf.rect(margin, y, W - margin * 2, 7, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text('Servicio', cols[0], y + 5)
      pdf.text('Veces', cols[2], y + 5, { align: 'right' })
      pdf.text('Ingresos', cols[4], y + 5, { align: 'right' })
      y += 7

      topServices.slice(0, 10).forEach((s, i) => {
        if (y > 270) { pdf.addPage(); y = 20 }
        if (i % 2 === 0) { pdf.setFillColor(249, 249, 249); pdf.rect(margin, y, W - margin * 2, 7, 'F') }
        pdf.setTextColor(30, 30, 30)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text(s.nombre.slice(0, 55), cols[0], y + 5)
        pdf.text(String(s.count), cols[2], y + 5, { align: 'right' })
        pdf.setTextColor(201, 168, 76)
        pdf.text(fmt(s.revenue), cols[4], y + 5, { align: 'right' })
        y += 7
      })
    }

    // Footer
    pdf.setFontSize(7)
    pdf.setTextColor(150, 150, 150)
    pdf.setFont('helvetica', 'normal')
    const pages = (pdf as any).internal.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i)
      pdf.text(`Velik Beauty House · Página ${i} de ${pages}`, W / 2, 290, { align: 'center' })
    }

    pdf.save(`${fileName}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
  }
}
