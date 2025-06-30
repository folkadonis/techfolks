import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import LoadingSpinner from '@components/common/LoadingSpinner'

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <LoadingSpinner size="lg" />
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectedRoute