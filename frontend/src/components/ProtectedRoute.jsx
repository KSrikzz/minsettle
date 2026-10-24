import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const ProtectedRoute = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
          <span>Loading session...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
