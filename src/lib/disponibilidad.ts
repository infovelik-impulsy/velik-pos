import { supabase } from './supabase'

// Buffer entre citas configurado en GHL (slotBuffer) — se aplica tambien aqui
// para que el chequeo interno del POS sea consistente con la disponibilidad
// real que ven Eli y la web.
const BUFFER_MIN = 15

// Verifica si un profesional ya tiene una cita (o bloqueo) que se solapa con
// el rango de tiempo pedido, usando la duracion REAL del servicio existente
// (no solo la hora de inicio) — para evitar que una cita larga (ej. Press On
// de 2 horas, 9-11am) quede "tapada" por otra cita creada a las 10am. Incluye
// el buffer de 15 min antes/despues de cada cita existente.
export async function verificarSolape(
  profesionalId: string,
  startISO: string,
  endISO: string,
  excluirCitaId?: string
): Promise<{ solapa: boolean; detalle?: string }> {
  const fecha = startISO.slice(0, 10)
  const { data } = await supabase
    .from('citas')
    .select('id, titulo, cliente_nombre, start_time, end_time')
    .eq('profesional_id', profesionalId)
    .eq('fecha', fecha)
    .neq('status', 'cancelled')

  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  const bufferMs = BUFFER_MIN * 60000

  const choque = (data || []).find(c => {
    if (excluirCitaId && c.id === excluirCitaId) return false
    const cs = new Date(c.start_time).getTime() - bufferMs
    const ce = new Date(c.end_time).getTime() + bufferMs
    return start < ce && cs < end
  })

  if (!choque) return { solapa: false }
  return {
    solapa: true,
    detalle: `${choque.cliente_nombre || 'otra clienta'} (${choque.titulo || 'cita'}) de ${new Date(choque.start_time).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })} a ${new Date(choque.end_time).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`,
  }
}
