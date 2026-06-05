import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import Agenda from './pages/Agenda'
import NuevaVenta from './pages/NuevaVenta'
import Caja from './pages/Caja'
import Cierre from './pages/Cierre'
import Resumen from './pages/Resumen'
import Facturacion from './pages/Facturacion'

export default function App() {
  const [user, setUser] = useState<{ id: string; nombre: string } | null>(null)

  if (!user) {
    return <Login onLogin={(id, nombre) => setUser({ id, nombre })} />
  }

  return (
    <BrowserRouter>
      <Layout userName={user.nombre} onLogout={() => setUser(null)}>
        <Routes>
          <Route path="/" element={<Agenda />} />
          <Route path="/venta" element={<NuevaVenta />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/facturacion" element={<Facturacion />} />
          <Route path="/cierre" element={<Cierre />} />
          <Route path="/resumen" element={<Resumen />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
