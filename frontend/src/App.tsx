import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { type RootState } from '@/redux/reducers'
import Login from '@/pages/Login'
import Scraper from './pages/Scraper'

function Home() {
  
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/scraper" replace />

}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/scraper" element={<Scraper />} />
      <Route path="/" element={<Home />} />
      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App