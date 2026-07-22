export interface Profesional {
  id: string
  nombre: string
  color: string
}

export const PROFESIONALES: Profesional[] = [
  { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Luz Aida', color: '#A0856C' },
  { id: 'xUf32I3dzoylUW8VDH9z', nombre: 'Zuly Rojas', color: '#8A7B6E' },
  { id: 'YCFWZJMJzmDEA1MJv27k', nombre: 'Juliana García', color: '#B89A7E' },
  { id: '2lvoTms5Sg8ubmjjUaGs', nombre: 'Maria Osorio', color: '#C9A084' },
]

export function getProfesional(id: string): Profesional | undefined {
  return PROFESIONALES.find(p => p.id === id)
}

export interface ServicioVendido {
  nombre: string
  precio: number
}

export interface Venta {
  id: string
  created_at: string
  fecha: string
  appointment_id?: string
  contact_id?: string
  cliente_nombre: string
  cliente_telefono?: string
  profesional_id: string
  profesional_nombre: string
  servicios: ServicioVendido[]
  total: number
  metodo_pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'mixto'
  pagado_efectivo: number
  pagado_digital: number
  pagado_transferencia?: number
  pagado_tarjeta?: number
  comision_profesional: number
  comision_velik: number
  notas?: string
  estado: string
}

export interface Gasto {
  id: string
  created_at: string
  fecha: string
  descripcion: string
  monto: number
  categoria: string
}

export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta Déb/Créd' },
  { value: 'mixto', label: 'Mixto' },
  { value: 'de_la_casa', label: 'De la casa' },
] as const

export const USUARIOS = [
  { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Luz Aida (Admin)', pin: '1900', rol: 'admin' },
  { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Luz Aida (Admin)', pin: '1800', rol: 'admin' },
  { id: 'xUf32I3dzoylUW8VDH9z', nombre: 'Zuly Rojas', pin: '0704', rol: 'profesional' },
  { id: 'YCFWZJMJzmDEA1MJv27k', nombre: 'Juliana García', pin: '0405', rol: 'profesional' },
  { id: 'h9MxOmhWbbosHU0BR8MT', nombre: 'Leidy Saldarriaga', pin: '0612', rol: 'profesional' },
  { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Manuela (Recepción)', pin: '0987', rol: 'recepcion' },
]
