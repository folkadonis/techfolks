import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuthStore } from '@store/authStore'
import Layout from '@components/common/Layout'
import LoadingSpinner from '@components/common/LoadingSpinner'
import ProtectedRoute from '@components/auth/ProtectedRoute'

// Lazy load pages for better performance
const HomePage = lazy(() => import('@pages/HomePage'))
const LoginPage = lazy(() => import('@pages/LoginPage'))
const RegisterPage = lazy(() => import('@pages/RegisterPage'))
const ProblemsPage = lazy(() => import('@pages/ProblemsPage'))
const ProblemDetailPage = lazy(() => import('@pages/ProblemDetailPage'))
const ContestsPage = lazy(() => import('@pages/ContestsPage'))
const ContestDetailPage = lazy(() => import('@pages/ContestDetailPage'))
const LeaderboardPage = lazy(() => import('@pages/LeaderboardPage'))
const ProfilePage = lazy(() => import('@pages/ProfilePage'))
const SubmissionsPage = lazy(() => import('@pages/SubmissionsPage'))
const DashboardPage = lazy(() => import('@pages/DashboardPage'))

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/contests/:id" element={<ContestDetailPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
          </Route>

          {/* Catch all - 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App