import { useState } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { exportToExcel, exportToPDF } from '../../lib/export-utils'
import type { DailySalesData, ProfessionalMetrics, ServiceMetric, PaymentBreakdown } from '../../lib/billing-queries'

interface ExportButtonsProps {
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

export default function ExportButtons({
  dateRange,
  metrics,
  dailySales,
  professionals,
  topServices,
  paymentBreakdown,
}: ExportButtonsProps) {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const fileName = `Facturacion_${dateRange.desde}_a_${dateRange.hasta}`
      await exportToExcel(
        {
          dateRange,
          metrics,
          dailySales,
          professionals,
          topServices,
          paymentBreakdown,
        },
        fileName
      )
    } catch (error) {
      console.error('Error exporting Excel:', error)
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      const fileName = `Facturacion_${dateRange.desde}_a_${dateRange.hasta}`
      await exportToPDF('dashboard-content', fileName, dateRange)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportExcel}
        disabled={exporting !== null}
        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        <FileSpreadsheet size={14} />
        {exporting === 'excel' ? 'Descargando...' : 'Excel'}
      </button>

      <button
        onClick={handleExportPDF}
        disabled={exporting !== null}
        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        <FileText size={14} />
        {exporting === 'pdf' ? 'Descargando...' : 'PDF'}
      </button>
    </div>
  )
}
