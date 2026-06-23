import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ClienteResumen {
  telefono: string
  nombre: string
  visitas: number
  ultimo_servicio: string
  total_gastado: number
}

export default function Clientes({ rol = 'admin' }: { rol?: string }) {
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const esAdmin = rol === 'admin'

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('ventas')
      .select('cliente_telefono, cliente_nombre, fecha_cita, total, metodo_pago')
      .order('fecha_cita', { ascending: false })

    if (!data) { setLoading(false); return }

    const map = new Map<string, ClienteResumen>()
    data.forEach(v => {
      const key = v.cliente_telefono || v.cliente_nombre
      if (!map.has(key)) {
        map.set(key, {
          telefono: v.cliente_telefono || '',
          nombre: v.cliente_nombre || '',
          visitas: 0,
          ultimo_servicio: v.fecha_cita || '',
          total_gastado: 0,
        })
      }
      const c = map.get(key)!
      c.visitas += 1
      if (v.metodo_pago !== 'de_la_casa') c.total_gastado += v.total || 0
      if ((v.fecha_cita || '') > c.ultimo_servicio) c.ultimo_servicio = v.fecha_cita
    })

    setClientes(Array.from(map.values()).sort((a, b) => b.visitas - a.visitas))
    setLoading(false)
  }

  const filtrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda)
  )

  function fmtDate(d: string) {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <h2 className="font-serif text-2xl font-light mb-5">Clientes</h2>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-9 pr-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm focus:outline-none focus:border-[#C9A84C]"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#8a7a6a] text-sm">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20 text-[#8a7a6a] text-sm">No se encontraron clientes</div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(c => (
            <button
              key={c.telefono || c.nombre}
              onClick={() => navigate('/clientes/' + encodeURIComponent(c.telefono || c.nombre), { state: c })}
              className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#f0ebe0] flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-[#C9A84C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#1a1a1a] truncate">{c.nombre}</p>
                {esAdmin && <p className="text-xs text-[#8a7a6a] mt-0.5">{c.telefono || '—'}</p>}
              </div>
              <div className="text-right flex-shrink-0 mr-1">
                <p className="text-sm font-semibold text-[#C9A84C]">{c.visitas} {c.visitas === 1 ? 'visita' : 'visitas'}</p>
                <p className="text-xs text-[#8a7a6a]">Última: {fmtDate(c.ultimo_servicio)}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
