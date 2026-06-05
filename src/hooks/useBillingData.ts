import { useState, useEffect } from 'react'
import {
  getDailySalesData,
  getProfessionalBreakdown,
  getTopServices,
  getPaymentMethodBreakdown,
  getTotalMetrics,
  type DailySalesData,
  type ProfessionalMetrics,
  type ServiceMetric,
  type PaymentBreakdown,
} from '../lib/billing-queries'

interface BillingData {
  dailySales: DailySalesData[]
  professionals: ProfessionalMetrics[]
  topServices: ServiceMetric[]
  paymentBreakdown: PaymentBreakdown
  metrics: {
    totalIncome: number
    totalComisiones: number
    transactionCount: number
    averageTransaction: number
  }
}

export function useBillingData(startDate: string, endDate: string) {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [dailySales, professionals, topServices, paymentBreakdown, metrics] =
          await Promise.all([
            getDailySalesData(startDate, endDate),
            getProfessionalBreakdown(startDate, endDate),
            getTopServices(startDate, endDate, 10),
            getPaymentMethodBreakdown(startDate, endDate),
            getTotalMetrics(startDate, endDate),
          ])

        setData({
          dailySales,
          professionals,
          topServices,
          paymentBreakdown,
          metrics,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate])

  return { data, loading, error }
}
