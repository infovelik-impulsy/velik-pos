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
  const profData: any[] = [['Profesional', 'Total Ventas', 'Comisión', 'Servicios']]
  data.professionals.forEach(prof => {
    profData.push([prof.nombre, prof.total, prof.comision, prof.servicios_count])
  })
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

export async function exportToPDF(elementId: string, fileName: string, dateRange: { desde: string; hasta: string }) {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with id ${elementId} not found`)
    return
  }

  try {
    // Capture the element as image
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    const pdf = new jsPDF('p', 'mm', 'a4')
    let position = 0

    // Add header
    pdf.setFontSize(16)
    pdf.text('REPORTE DE FACTURACIÓN - VELIK BEAUTY HOUSE', 20, 15)
    pdf.setFontSize(10)
    pdf.text(`Período: ${dateRange.desde} a ${dateRange.hasta}`, 20, 22)
    pdf.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 20, 28)

    position = 35

    // Add image
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= imgHeight

    // Add new pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= imgHeight
    }

    pdf.save(`${fileName}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
  }
}
