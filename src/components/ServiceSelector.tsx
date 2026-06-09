import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
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
  selectedName?: string
}

export default function ServiceSelector({ onSelect, selectedName }: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isOpen, setIsOpen] = useState(false)
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
        setSelectedCategory('Todos')
      }
      setLoading(false)
    }

    loadServices()
  }, [])

  const filtered = selectedCategory === 'Todos'
    ? services
    : services.filter(s => s.categoria === selectedCategory)

  const handleSelect = (service: Service) => {
    onSelect(service)
    setIsOpen(false)
  }

  return (
    <div className="space-y-3">
      {/* Category Filter */}
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

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando servicios...</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
          {filtered.map(service => (
            <button
              key={service.id}
              onClick={() => handleSelect(service)}
              className="p-3 border border-gray-200 rounded-lg hover:border-[#C9A84C] hover:bg-[#f9f6ee] transition-all text-left"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm">{service.nombre}</span>
                <span className="text-[#C9A84C] font-semibold text-sm">
                  ${service.precio.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                ⏱️ {service.duracion} min
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
