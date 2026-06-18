import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Service {
  id: number
  nombre: string
  precio: number
  categoria: string
  duracion: number
}

interface ServiceSelectorProps {
  onSelect: (service: Service) => void
}

export default function ServiceSelector({ onSelect }: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadServices() {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .order('categoria', { ascending: true })

      if (!error && data) {
        setServices(data as Service[])
        const cats = ['Todos', ...Array.from(new Set((data as Service[]).map(s => s.categoria)))]
        setCategories(cats as string[])
      }
      setLoading(false)
    }
    loadServices()
  }, [])

  const filtered = services.filter(s => {
    const matchCat = selectedCategory === 'Todos' || s.categoria === selectedCategory
    const matchBusq = !busqueda || s.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setSelectedCategory('Todos') }}
          placeholder="Buscar servicio..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]"
        />
      </div>

      {/* Categorías */}
      {!busqueda && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#C9A84C] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Lista de servicios */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando servicios...</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No se encontró "{busqueda}"</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
          {filtered.map(service => (
            <button
              key={service.id}
              onClick={() => { onSelect(service); setBusqueda('') }}
              className="p-3 border border-gray-200 rounded-lg hover:border-[#C9A84C] hover:bg-[#f9f6ee] transition-all text-left"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm">{service.nombre}</span>
                <span className="text-[#C9A84C] font-semibold text-sm">
                  ${service.precio.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="text-xs text-gray-500">⏱️ {service.duracion} min · {service.categoria}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
