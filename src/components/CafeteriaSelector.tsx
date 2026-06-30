import { useState, useEffect, useCallback } from 'react'
import { Search, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CAFETERIA_ITEMS, type ItemCafeteria } from '../data/cafeteriaData'

export interface ItemCafeteriaCarrito {
  id: string
  nombre: string
  precio: number
  cantidad: number
}

interface StockRow { id: string; stock: number; precio: number }

interface Props {
  onSelect: (item: ItemCafeteriaCarrito) => void
}

export default function CafeteriaSelector({ onSelect }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [stock, setStock] = useState<Record<string, StockRow>>({})
  const [loadingStock, setLoadingStock] = useState(true)

  const loadStock = useCallback(async () => {
    const { data } = await supabase
      .from('cafeteria_inventario')
      .select('id, stock, precio')
    if (data) {
      const map: Record<string, StockRow> = {}
      for (const row of data) map[row.id] = row
      setStock(map)
    }
    setLoadingStock(false)
  }, [])

  useEffect(() => { loadStock() }, [loadStock])

  const getStock = (id: string) => stock[id]?.stock ?? CAFETERIA_ITEMS.find(i => i.id === id)?.stock_inicial ?? 0
  const getPrecio = (item: ItemCafeteria) => stock[item.id]?.precio ?? item.precio

  const bebidas = CAFETERIA_ITEMS.filter(i => i.categoria === 'Bebidas')

  const filtered = bebidas.filter(i =>
    !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function handleSelect(item: ItemCafeteria) {
    const stockActual = getStock(item.id)
    if (stockActual <= 0) return
    onSelect({ id: item.id, nombre: item.nombre, precio: getPrecio(item), cantidad: 1 })
    setBusqueda('')
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar item cafetería..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C]"
        />
      </div>

      {loadingStock ? (
        <p className="text-xs text-gray-400 text-center py-3">Cargando inventario...</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {filtered.map(item => {
            const stockActual = getStock(item.id)
            const precio = getPrecio(item)
            const sinStock = stockActual <= 0
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                disabled={sinStock}
                className={`p-3 border rounded-lg transition-all text-left ${
                  sinStock
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-[#4CAF50] hover:bg-green-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{item.nombre}</span>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {precio > 0 && (
                      <span className="text-[#4CAF50] font-semibold text-sm">
                        ${precio.toLocaleString('es-CO')}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      sinStock ? 'bg-red-100 text-red-500' :
                      stockActual <= 3 ? 'bg-orange-100 text-orange-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <Package size={10} />
                      {sinStock ? 'Agotado' : stockActual}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{item.categoria}</p>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No encontrado</p>
          )}
        </div>
      )}
    </div>
  )
}
