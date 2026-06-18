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

export function useBillingData(startDate: string, endDate: string, profesionalId?: string) {
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
            getDailySalesData(startDate, endDate, profesionalId),
            getProfessionalBreakdown(startDate, endDate, profesionalId),
            getTopServices(startDate, endDate, 10, profesionalId),
            getPaymentMethodBreakdown(startDate, endDate, profesionalId),
            getTotalMetrics(startDate, endDate, profesionalId),
          ])

        setData({ dailySales, professionals, topServices, paymentBreakdown, metrics })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate, profesionalId])

  return { data, loading, error }
}
