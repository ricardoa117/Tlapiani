import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Registro from './pages/auth/Registro'
import ProductorDashboard from './pages/productor/ProductorDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import ProductorPerfil from './pages/productor/ProductorPerfil'
import ProductorInstructivo from './pages/productor/ProductorInstructivo'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      {/* Rutas de productor */}
      <Route path="/productor/dashboard" element={<ProductorDashboard />} />
      <Route path="/productor/perfil" element={<ProductorPerfil />} />
      <Route path="/productor/instructivo" element={<ProductorInstructivo />} />
      {/* Rutas de admin */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/usuarios" element={<AdminUsers />} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App