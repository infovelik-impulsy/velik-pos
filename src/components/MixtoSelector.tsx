type MetodoSimple = 'efectivo' | 'transferencia' | 'tarjeta'

const OPCIONES: { value: MetodoSimple; label: string; icono: string }[] = [
  { value: 'efectivo', label: 'Efectivo', icono: '💵' },
  { value: 'transferencia', label: 'Transferencia', icono: '🏦' },
  { value: 'tarjeta', label: 'Tarjeta', icono: '💳' },
]

export interface MixtoValue {
  metodo1: MetodoSimple
  metodo2: MetodoSimple
  monto1: number
}

interface MixtoSelectorProps {
  total: number
  value: MixtoValue
  onChange: (v: MixtoValue) => void
}

export default function MixtoSelector({ total, value, onChange }: MixtoSelectorProps) {
  const { metodo1, metodo2, monto1 } = value
  const monto2 = Math.max(0, total - monto1)

  function elegirMetodo1(m: MetodoSimple) {
    const nuevoMetodo2 = metodo2 === m ? (OPCIONES.find(o => o.value !== m)?.value || metodo2) : metodo2
    onChange({ metodo1: m, metodo2: nuevoMetodo2, monto1 })
  }
  function elegirMetodo2(m: MetodoSimple) {
    const nuevoMetodo1 = metodo1 === m ? (OPCIONES.find(o => o.value !== m)?.value || metodo1) : metodo1
    onChange({ metodo1: nuevoMetodo1, metodo2: m, monto1 })
  }

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">Primer método</p>
        <div className="grid grid-cols-3 gap-1.5">
          {OPCIONES.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => elegirMetodo1(o.value)}
              disabled={o.value === metodo2}
              className={`py-1.5 rounded-lg text-xs font-medium border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                metodo1 === o.value ? 'bg-[#C9A84C] text-white border-[#C9A84C]' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
              }`}
            >
              {o.icono} {o.label}
            </button>
          ))}
        </div>
        <div className="relative mt-1.5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            value={monto1 || ''}
            onChange={e => onChange({ metodo1, metodo2, monto1: Number(e.target.value) })}
            className="w-full border border-gray-200 rounded-xl pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Segundo método</p>
        <div className="grid grid-cols-3 gap-1.5">
          {OPCIONES.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => elegirMetodo2(o.value)}
              disabled={o.value === metodo1}
              className={`py-1.5 rounded-lg text-xs font-medium border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                metodo2 === o.value ? 'bg-[#C9A84C] text-white border-[#C9A84C]' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
              }`}
            >
              {o.icono} {o.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-xs text-gray-400">Se calcula automático</span>
          <span className="text-sm font-medium text-gray-600">${monto2.toLocaleString('es-CO')}</span>
        </div>
      </div>
    </div>
  )
}

export function calcularMontosMixto(total: number, v: MixtoValue) {
  const monto2 = Math.max(0, total - v.monto1)
  const porMetodo: Record<MetodoSimple, number> = { efectivo: 0, transferencia: 0, tarjeta: 0 }
  porMetodo[v.metodo1] += v.monto1
  porMetodo[v.metodo2] += monto2
  const efectivo = porMetodo.efectivo
  const transferencia = porMetodo.transferencia
  const tarjeta = porMetodo.tarjeta
  const digital = transferencia + tarjeta
  const OPT = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' } as const
  const detalle = `Mixto: ${OPT[v.metodo1]} $${v.monto1.toLocaleString('es-CO')} + ${OPT[v.metodo2]} $${monto2.toLocaleString('es-CO')}`
  return { efectivo, transferencia, tarjeta, digital, detalle }
}
