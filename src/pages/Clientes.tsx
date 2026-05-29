import { useState } from 'react'
import { Search, Phone, Clock, ChevronRight } from 'lucide-react'
import { searchContacts, getContactAppointments } from '../lib/ghl'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Venta } from '../types'

interface Contact {
  id: string
  name: string
  phone: string
  email: string
}

interface ClienteDetalle {
  contact: Contact
  citas: any[]
  ventas: Venta[]
}

export default function Clientes() {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Contact[]>([])
  const [buscando, setBuscando] = useState(false)
  const [detalle, setDetalle] = useState<ClienteDetalle | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  async function buscar() {
    if (!query.trim()) return
    setBuscando(true)
    try {
      const r = await searchContacts(query)
      setResultados(r.slice(0, 10))
    } catch { setResultados([]) }
    setBuscando(false)
  }

  async function verDetalle(contact: Contact) {
    setLoadingDetalle(true)
    setDetalle(null)
    try {
      const [citas, { data: ventas }] = await Promise.all([
        getContactAppointments(contact.id),
        supabase.from('ventas').select('*').eq('contact_id', contact.id).order('created_at', { ascending: false }),
      ])
      setDetalle({ contact, citas: citas.slice(0, 10), ventas: ventas || [] })
    } catch { setDetalle({ contact, citas: [], ventas: [] }) }
    setLoadingDetalle(false)
  }

  if (detalle) {
    const totalGastado = detalle.ventas.reduce((s, v) => s + v.total, 0)
    return (
      <div className="p-4 max-w-lg mx-auto pb-8">
        <button onClick={() => setDetalle(null)} className="text-[#C9A84C] text-sm mb-4 flex items-center gap-1">
          ← Volver
        </button>
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="font-serif text-2xl font-light">{detalle.contact.name}</h2>
          {detalle.contact.phone && (
            <a href={`tel:${detalle.contact.phone}`} className="flex items-center gap-2 text-sm text-[#8a7a6a] mt-1">
              <Phone size={14} /> {detalle.contact.phone}
            </a>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-[#C9A84C]">{detalle.ventas.length}</p>
              <p className="text-xs text-[#8a7a6a]">Servicios en POS</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-[#C9A84C]">${totalGastado.toLocaleString('es-CO')}</p>
              <p className="text-xs text-[#8a7a6a]">Total gastado</p>
            </div>
          </div>
        </div>

        {detalle.ventas.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Historial de servicios (POS)</h3>
            <div className="space-y-3">
              {detalle.ventas.map(v => (
                <div key={v.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{v.profesional_nombre}</span>
                    <span className="text-sm font-semibold text-[#C9A84C]">${v.total.toLocaleString('es-CO')}</span>
                  </div>
                  <p className="text-xs text-[#8a7a6a] mt-0.5">
                    {(v.servicios as any[]).map((s: any) => s.nombre).join(', ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(v.created_at), "d MMM yyyy", { locale: es })}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {detalle.citas.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-widest text-[#8a7a6a] mb-3">Citas en GHL</h3>
            <div className="space-y-2">
              {detalle.citas.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <Clock size={14} className="text-[#8a7a6a] shrink-0" />
                  <div>
                    <p className="text-sm">{c.title}</p>
                    <p className="text-xs text-gray-400">{format(new Date(c.startTime), "d MMM yyyy HH:mm", { locale: es })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="font-serif text-2xl font-light mb-6">Clientes</h2>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Nombre o teléfono..."
            className="w-full pl-9 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <button
          onClick={buscar}
          className="px-5 py-3 bg-[#C9A84C] text-white rounded-2xl text-sm font-medium hover:bg-[#b8963e]"
        >
          {buscando ? '...' : 'Buscar'}
        </button>
      </div>

      {loadingDetalle && <div className="text-center py-8 text-[#8a7a6a]">Cargando...</div>}

      {resultados.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {resultados.map((c, i) => (
            <button
              key={c.id}
              onClick={() => verDetalle(c)}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div className="text-left">
                <p className="text-sm font-medium">{c.name}</p>
                {c.phone && <p className="text-xs text-[#8a7a6a]">{c.phone}</p>}
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          ))}
        </div>
      )}

      {resultados.length === 0 && query && !buscando && (
        <p className="text-center text-sm text-gray-400 py-8">Sin resultados para "{query}"</p>
      )}
    </div>
  )
}
