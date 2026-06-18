import { supabase } from './supabase'

export interface DailySalesData {
  fecha: string
  total: number
  count: number
  efectivo: number
  digital: number
}

export interface ProfessionalMetrics {
  profesional_id: string
  nombre: string
  total: number
  comision: number
  servicios_count: number
}

export interface ServiceMetric {
  nombre: string
  count: number
  revenue: number
}

export interface PaymentBreakdown {
  efectivo: number
  transferencia: number
  tarjeta: number
  mixto: number
  total_transacciones: number
  total_dinero: number
}

export async function getDailySalesData(
  startDate: string,
  endDate: string
): Promise<DailySalesData[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('fecha_cita, total, pagado_efectivo, pagado_digital')
    .gte('fecha_cita', startDate)
    .lte('fecha_cita', endDate)
    .order('fecha_cita', { ascending: true })

  if (error) throw error

  const grouped = new Map<string, DailySalesData>()

  data?.forEach(row => {
    const fecha = row.fecha_cita
    if (!grouped.has(fecha)) {
      grouped.set(fecha, {
        fecha,
        total: 0,
        count: 0,
        efectivo: 0,
        digital: 0,
      })
    }
    const current = grouped.get(fecha)!
    current.total += row.total || 0
    current.count += 1
    current.efectivo += row.pagado_efectivo || 0
    current.digital += row.pagado_digital || 0
  })

  return Array.from(grouped.values())
}

export async function getProfessionalBreakdown(
  startDate: string,
  endDate: string
): Promise<ProfessionalMetrics[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('profesional_id, profesional_nombre, total, comision_profesional')
    .gte('fecha_cita', startDate)
    .lte('fecha_cita', endDate)

  if (error) throw error

  const grouped = new Map<string, ProfessionalMetrics>()

  data?.forEach(row => {
    const key = row.profesional_id
    if (!grouped.has(key)) {
      grouped.set(key, {
        profesional_id: row.profesional_id,
        nombre: row.profesional_nombre,
        total: 0,
        comision: 0,
        servicios_count: 0,
      })
    }
    const current = grouped.get(key)!
    current.total += row.total || 0
    current.comision += row.comision_profesional || 0
    current.servicios_count += 1
  })

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
}

export async function getTopServices(
  startDate: string,
  endDate: string,
  limit = 10
): Promise<ServiceMetric[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('servicios')
    .gte('fecha_cita', startDate)
    .lte('fecha_cita', endDate)

  if (error) throw error

  const grouped = new Map<string, { count: number; revenue: number }>()

  data?.forEach(row => {
    if (Array.isArray(row.servicios)) {
      row.servicios.forEach((srv: any) => {
        const nombre = srv.nombre || 'Sin nombre'
        if (!grouped.has(nombre)) {
          grouped.set(nombre, { count: 0, revenue: 0 })
        }
        const current = grouped.get(nombre)!
        current.count += 1
        current.revenue += srv.precio || 0
      })
    }
  })

  return Array.from(grouped.entries())
    .map(([nombre, { count, revenue }]) => ({ nombre, count, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export async function getPaymentMethodBreakdown(
  startDate: string,
  endDate: string
): Promise<PaymentBreakdown> {
  const { data, error } = await supabase
    .from('ventas')
    .select('metodo_pago, total, pagado_efectivo, pagado_digital')
    .gte('fecha_cita', startDate)
    .lte('fecha_cita', endDate)

  if (error) throw error

  const breakdown: PaymentBreakdown = {
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    mixto: 0,
    total_transacciones: 0,
    total_dinero: 0,
  }

  data?.forEach(row => {
    breakdown.total_transacciones += 1
    breakdown.total_dinero += row.total || 0

    if (row.metodo_pago === 'efectivo') {
      breakdown.efectivo += row.pagado_efectivo || 0
    } else if (row.metodo_pago === 'transferencia') {
      breakdown.transferencia += row.pagado_digital || 0
    } else if (row.metodo_pago === 'tarjeta') {
      breakdown.tarjeta += row.pagado_digital || 0
    } else if (row.metodo_pago === 'mixto') {
      breakdown.efectivo += row.pagado_efectivo || 0
      breakdown.mixto += row.pagado_digital || 0
    }
  })

  return breakdown
}

export async function getTotalMetrics(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('ventas')
    .select('total, comision_profesional')
    .gte('fecha_cita', startDate)
    .lte('fecha_cita', endDate)

  if (error) throw error

  const totalIncome = data?.reduce((sum, row) => sum + (row.total || 0), 0) || 0
  const totalComisiones =
    data?.reduce((sum, row) => sum + (row.comision_profesional || 0), 0) || 0
  const transactionCount = data?.length || 0
  const averageTransaction = transactionCount > 0 ? totalIncome / transactionCount : 0

  return {
    totalIncome,
    totalComisiones,
    transactionCount,
    averageTransaction,
  }
}
