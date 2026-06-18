import { useState } from 'react'
import { Search } from 'lucide-react'
import { PRODUCTOS, CATEGORIAS_PRODUCTOS, type Producto } from '../data/productosData'

interface Props {
  onSelect: (producto: Producto) => void
}

export default function ProductoSelector({ onSelect }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')

  const filtered = PRODUCTOS.filter(p => {
    const matchCat = categoria === 'Todos' || p.categoria === categoria
    const matchBusq = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setCategoria('Todos') }}
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]"
        />
      </div>

      {!busqueda && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['Todos', ...CATEGORIAS_PRODUCTOS].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                categoria === cat
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto">
        {filtered.map((p, i) => (
          <button
            key={i}
            onClick={() => { onSelect(p); setBusqueda('') }}
            className="p-3 border border-gray-200 rounded-lg hover:border-[#C9A84C] hover:bg-[#f9f6ee] transition-all text-left"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{p.nombre}</span>
              <span className="text-[#C9A84C] font-semibold text-sm ml-2 shrink-0">
                ${p.precio.toLocaleString('es-CO')}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{p.categoria}</p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No encontrado</p>
        )}
      </div>
    </div>
  )
}
