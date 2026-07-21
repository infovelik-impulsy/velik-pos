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
  comision_velik: number
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
  de_la_casa: number
  ventas_mixtas: number
  total_transacciones: number
  total_dinero: number
}

function applyFilters(query: any, startDate: string, endDate: string, profesionalId?: string) {
  query = query.gte('fecha_cita', startDate).lte('fecha_cita', endDate)
  if (profesionalId) query = query.eq('profesional_id', profesionalId)
  return query
}

export async function getDailySalesData(
  startDate: string,
  endDate: string,
  profesionalId?: string
): Promise<DailySalesData[]> {
  let query = supabase
    .from('ventas')
    .select('fecha_cita, total, pagado_efectivo, pagado_digital')
    .order('fecha_cita', { ascending: true })

  query = applyFilters(query, startDate, endDate, profesionalId)
  const { data, error } = await query
  if (error) throw error

  const grouped = new Map<string, DailySalesData>()
  data?.forEach(row => {
    const fecha = row.fecha_cita
    if (!grouped.has(fecha)) {
      grouped.set(fecha, { fecha, total: 0, count: 0, efectivo: 0, digital: 0 })
    }
    const cur = grouped.get(fecha)!
    cur.total += row.total || 0
    cur.count += 1
    cur.efectivo += row.pagado_efectivo || 0
    cur.digital += row.pagado_digital || 0
  })

  return Array.from(grouped.values())
}

export async function getProfessionalBreakdown(
  startDate: string,
  endDate: string,
  profesionalId?: string
): Promise<ProfessionalMetrics[]> {
  let query = supabase
    .from('ventas')
    .select('profesional_id, profesional_nombre, total, comision_profesional, metodo_pago')

  query = applyFilters(query, startDate, endDate, profesionalId)
  const { data, error } = await query
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
        comision_velik: 0,
        servicios_count: 0,
      })
    }
    const cur = grouped.get(key)!
    const total = row.total || 0
    const comPro = row.comision_profesional || 0
    // Excluir "de la casa" del total real, pero sí contar la comisión profesional que se le paga
    if (row.metodo_pago !== 'de_la_casa') cur.total += total
    cur.comision += comPro
    cur.comision_velik += total - comPro
    cur.servicios_count += 1
  })

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total)
}

export async function getTopServices(
  startDate: string,
  endDate: string,
  limit = 10,
  profesionalId?: string
): Promise<ServiceMetric[]> {
  let query = supabase.from('ventas').select('servicios')
  query = applyFilters(query, startDate, endDate, profesionalId)
  const { data, error } = await query
  if (error) throw error

  const grouped = new Map<string, { count: number; revenue: number }>()
  data?.forEach(row => {
    if (Array.isArray(row.servicios)) {
      row.servicios.forEach((srv: any) => {
        const nombre = srv.nombre || 'Sin nombre'
        if (!grouped.has(nombre)) grouped.set(nombre, { count: 0, revenue: 0 })
        const cur = grouped.get(nombre)!
        cur.count += 1
        cur.revenue += srv.precio || 0
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
  endDate: string,
  profesionalId?: string
): Promise<PaymentBreakdown> {
  let query = supabase
    .from('ventas')
    .select('metodo_pago, total, pagado_efectivo, pagado_transferencia, pagado_tarjeta, pagado_digital')

  query = applyFilters(query, startDate, endDate, profesionalId)
  const { data, error } = await query
  if (error) throw error

  const breakdown: PaymentBreakdown = {
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    de_la_casa: 0,
    ventas_mixtas: 0,
    total_transacciones: 0,
    total_dinero: 0,
  }

  data?.forEach(row => {
    breakdown.total_transacciones += 1

    if (row.metodo_pago === 'de_la_casa') {
      breakdown.de_la_casa += row.total || 0
      return
    }

    breakdown.total_dinero += row.total || 0
    breakdown.efectivo += row.pagado_efectivo || 0
    // Compatibilidad: ventas antiguas antes de separar transferencia/tarjeta
    // solo tienen pagado_digital; si no hay desglose fino, cae en tarjeta por defecto.
    const tieneDesgloseFino = (row.pagado_transferencia || 0) > 0 || (row.pagado_tarjeta || 0) > 0
    if (tieneDesgloseFino) {
      breakdown.transferencia += row.pagado_transferencia || 0
      breakdown.tarjeta += row.pagado_tarjeta || 0
    } else if (row.metodo_pago === 'transferencia') {
      breakdown.transferencia += row.pagado_digital || 0
    } else if (row.pagado_digital) {
      breakdown.tarjeta += row.pagado_digital || 0
    }
    if (row.metodo_pago === 'mixto') breakdown.ventas_mixtas += 1
  })

  return breakdown
}

export async function getTotalMetrics(
  startDate: string,
  endDate: string,
  profesionalId?: string
) {
  let query = supabase.from('ventas').select('total, comision_profesional, metodo_pago')
  query = applyFilters(query, startDate, endDate, profesionalId)
  const { data, error } = await query
  if (error) throw error

  // "de la casa" no cuenta como ingreso real
  const totalIncome = data?.reduce((s, r) => r.metodo_pago === 'de_la_casa' ? s : s + (r.total || 0), 0) || 0
  const totalComisiones = data?.reduce((s, r) => s + (r.comision_profesional || 0), 0) || 0
  const transactionCount = data?.filter(r => r.metodo_pago !== 'de_la_casa').length || 0
  const averageTransaction = transactionCount > 0 ? totalIncome / transactionCount : 0

  return { totalIncome, totalComisiones, transactionCount, averageTransaction }
}
