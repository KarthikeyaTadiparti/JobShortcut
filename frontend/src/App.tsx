import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { type RootState } from '@/redux/reducers'
import AdminLogin from '@/pages/AdminLogin'
import AdminScraper from './pages/AdminScraper'
import UserJobs from './pages/UserJobs'

function Admin() {

  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <Navigate to="/admin/scraper" replace />

}

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/scraper" element={<AdminScraper />} />
      
      <Route path="/" element={<UserJobs />} />

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App