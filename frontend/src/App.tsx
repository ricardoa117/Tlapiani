import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Registro from './pages/auth/Registro'
import ProductorDashboard from './pages/productor/ProductorDashboard'

function App() {
  return (
    <Routes>   {/* Solo <Routes>, sin <Router> */}
      <Route path="/" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/dashboard" element={<ProductorDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App