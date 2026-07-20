// Festivos de Colombia 2026 — mantener sincronizado con el prompt de Eli (n8n)
// y con los bloqueos de horario creados en GHL (calendars/events/block-slots).
export const FESTIVOS_2026: Record<string, string> = {
  '2026-01-01': 'Año Nuevo',
  '2026-01-12': 'Reyes Magos',
  '2026-03-23': 'San José',
  '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-05-18': 'Ascensión del Señor',
  '2026-06-08': 'Corpus Christi',
  '2026-06-15': 'Sagrado Corazón',
  '2026-06-29': 'San Pedro y San Pablo',
  '2026-07-20': 'Día de la Independencia',
  '2026-08-07': 'Batalla de Boyacá',
  '2026-08-17': 'Asunción de la Virgen',
  '2026-10-12': 'Día de la Raza',
  '2026-11-02': 'Todos los Santos',
  '2026-11-16': 'Independencia de Cartagena',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',
}

export function esDomingo(fechaStr: string): boolean {
  return new Date(fechaStr + 'T12:00:00').getDay() === 0
}

export function nombreFestivo(fechaStr: string): string | null {
  return FESTIVOS_2026[fechaStr] || null
}

export function diaCerrado(fechaStr: string): { cerrado: boolean; motivo?: string } {
  const festivo = nombreFestivo(fechaStr)
  if (festivo) return { cerrado: true, motivo: `festivo (${festivo})` }
  if (esDomingo(fechaStr)) return { cerrado: true, motivo: 'domingo' }
  return { cerrado: false }
}
