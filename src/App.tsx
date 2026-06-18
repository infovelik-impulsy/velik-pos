import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import Agenda from './pages/Agenda'
import NuevaVenta from './pages/NuevaVenta'
import NuevaCita from './pages/NuevaCita'
import Caja from './pages/Caja'
import Cierre from './pages/Cierre'
import Resumen from './pages/Resumen'
import Facturacion from './pages/Facturacion'
import Liquidacion from './pages/Liquidacion'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'
import ProAgenda from './pages/ProAgenda'

export default function App() {
  const [user, setUser] = useState<{ id: string; nombre: string; rol: string } | null>(null)

  if (!user) {
    return <Login onLogin={(id, nombre, rol) => setUser({ id, nombre, rol })} />
  }

  if (user.rol === 'profesional') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/venta" element={<NuevaVenta />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:telefono" element={<ClienteDetalle />} />
          <Route path="*" element={<ProAgenda profesionalId={user.id} nombre={user.nombre} onLogout={() => setUser(null)} />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Layout userName={user.nombre} onLogout={() => setUser(null)}>
        <Routes>
          <Route path="/" element={<Agenda />} />
          <Route path="/venta" element={<NuevaVenta />} />
          <Route path="/nueva-cita" element={<NuevaCita />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/facturacion" element={<Facturacion />} />
          <Route path="/liquidacion" element={<Liquidacion />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:telefono" element={<ClienteDetalle />} />
          <Route path="/cierre" element={<Cierre />} />
          <Route path="/resumen" element={<Resumen />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
