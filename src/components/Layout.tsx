import { NavLink } from 'react-router-dom'
import { CalendarDays, PlusCircle, Wallet, TrendingUp, BarChart3, LogOut, BarChart2, DollarSign } from 'lucide-react'

interface Props {
  children: React.ReactNode
  userName: string
  onLogout: () => void
}

const nav = [
  { to: '/', icon: CalendarDays, label: 'Agenda' },
  { to: '/venta', icon: PlusCircle, label: 'Nueva Venta' },
  { to: '/caja', icon: Wallet, label: 'Caja' },
  { to: '/facturacion', icon: BarChart2, label: 'Facturación' },
  { to: '/liquidacion', icon: DollarSign, label: 'Liquidación' },
  { to: '/resumen', icon: TrendingUp, label: 'Resumen' },
  { to: '/cierre', icon: BarChart3, label: 'Cierre' },
]

export default function Layout({ children, userName, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-[#f5f4f0] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <span className="font-serif text-2xl font-light tracking-widest text-[#1a1a1a]">VELIK</span>
          <span className="text-xs text-[#8a7a6a] ml-2 tracking-widest uppercase">POS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#8a7a6a]">{userName}</span>
          <button onClick={onLogout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50 safe-area-inset-bottom">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
                isActive ? 'text-[#C9A84C]' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
