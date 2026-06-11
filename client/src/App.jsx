import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SystemAdmin from './pages/SystemAdmin'
import Employees from './pages/Employees'
import TrainingAdmin from './pages/TrainingAdmin'
import OJT from './pages/OJT'
import Certifications from './pages/Certifications'
import MpiRecords from './pages/MpiRecords'
import EmployeeRecords from './pages/EmployeeRecords'
import Staffing from './pages/Staffing'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { token } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/system-admin" element={<PrivateRoute><SystemAdmin /></PrivateRoute>} />
      <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
      <Route path="/training-admin" element={<PrivateRoute><TrainingAdmin /></PrivateRoute>} />
      <Route path="/ojt" element={<PrivateRoute><OJT /></PrivateRoute>} />
      <Route path="/certifications" element={<PrivateRoute><Certifications /></PrivateRoute>} />
      <Route path="/mpi-records" element={<PrivateRoute><MpiRecords /></PrivateRoute>} />
      <Route path="/employee-records" element={<PrivateRoute><EmployeeRecords /></PrivateRoute>} />
      <Route path="/staffing" element={<PrivateRoute><Staffing /></PrivateRoute>} />
      <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}