export interface Profesional {
  id: string
  nombre: string
  color: string
}

export const PROFESIONALES: Profesional[] = [
  { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Luz Aida', color: '#A0856C' },
  { id: 'saGMogKgCH3kmIhq4VlJ', nombre: 'Geraldine Berrio', color: '#B89B6E' },
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
  { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Luz Aida (Admin)', pin: '1234', rol: 'admin' },
  { id: 'UzLj5T8ZOrJ8reSig5os', nombre: 'Luz Aida',         pin: '3333', rol: 'profesional' },
  { id: 'saGMogKgCH3kmIhq4VlJ', nombre: 'Geraldine Berrio', pin: '4444', rol: 'profesional' },
]
