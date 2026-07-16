import { NavLink } from 'react-router-dom'
import { CalendarDays, PlusCircle, Wallet, TrendingUp, BarChart3, LogOut, BarChart2, DollarSign, Users, Ban } from 'lucide-react'

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
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/liquidacion', icon: DollarSign, label: 'Liquidación' },
  { to: '/bloquear-horario', icon: Ban, label: 'Bloquear Horario' },
  { to: '/resumen', icon: TrendingUp, label: 'Resumen' },
  { to: '/cierre', icon: BarChart3, label: 'Cierre' },
]

export default function Layout({ children, userName, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-[#f5f4f0] flex flex-col md:flex-row">

      {/* Sidebar — solo desktop */}
      <aside className="hidden md:flex flex-col w-52 bg-white border-r border-gray-100 min-h-screen sticky top-0 shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <span className="font-serif text-2xl font-light tracking-widest text-[#1a1a1a]">VELIK</span>
          <span className="text-xs text-[#8a7a6a] ml-2 tracking-widest uppercase">POS</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#C9A84C] text-white'
                    : 'text-[#8a7a6a] hover:bg-gray-50 hover:text-[#1a1a1a]'
                }`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Usuario + logout */}
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-[#8a7a6a] truncate mb-2">{userName}</p>
          <button onClick={onLogout} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar — solo móvil */}
        <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
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
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* Bottom nav — solo móvil */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
          <div className="flex overflow-x-auto scrollbar-none">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center py-2.5 px-3 gap-0.5 min-w-[64px] text-center transition-colors flex-shrink-0 ${
                    isActive ? 'text-[#C9A84C]' : 'text-gray-400 hover:text-gray-600'
                  }`
                }
              >
                <Icon size={18} />
                <span className="text-[9px] leading-tight whitespace-nowrap">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
