import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useAuthStore } from '@store/authStore'
import { useSettingsStore } from '@store/settingsStore'
import Layout from '@components/common/Layout'
import LoadingSpinner from '@components/common/LoadingSpinner'
import ProtectedRoute from '@components/auth/ProtectedRoute'

// Lazy load pages for better performance
const HomePage = lazy(() => import('@pages/HomePage'))
const LoginPage = lazy(() => import('@pages/LoginPage'))
const RegisterPage = lazy(() => import('@pages/RegisterPage'))
const ProblemsPage = lazy(() => import('@pages/ProblemsPage'))
const ProblemDetailPage = lazy(() => import('@pages/ProblemDetailPageEnhanced'))
const ProblemSolvingPage = lazy(() => import('@pages/ProblemSolvingPage'))
const ContestsPage = lazy(() => import('@pages/ContestsPage'))
const ContestDetailPage = lazy(() => import('@pages/ContestDetailPage'))
const LeaderboardPage = lazy(() => import('@pages/LeaderboardPage'))
const ProfilePage = lazy(() => import('@pages/ProfilePage'))
const SubmissionsPage = lazy(() => import('@pages/SubmissionsPage'))
const DashboardPage = lazy(() => import('@pages/DashboardPage'))
const GroupsPage = lazy(() => import('@pages/GroupsPage'))
const CreateProblemPage = lazy(() => import('@pages/CreateProblemPage'))
const EditProblemPage = lazy(() => import('@pages/EditProblemPage'))
const CreateContestPage = lazy(() => import('@pages/CreateContestPage'))
const EditContestPage = lazy(() => import('@pages/EditContestPage'))
const CreateGroupPage = lazy(() => import('@pages/CreateGroupPage'))
const EditGroupPage = lazy(() => import('@pages/EditGroupPage'))
const GroupManagePage = lazy(() => import('@pages/GroupManagePage'))
const GroupModeratePage = lazy(() => import('@pages/GroupModeratePage'))
const GroupDetailPage = lazy(() => import('@pages/GroupDetailPage'))
const GroupMembersPage = lazy(() => import('@pages/GroupMembersPage'))
const JoinGroupPage = lazy(() => import('@pages/JoinGroupPage'))
const GroupContestsPage = lazy(() => import('@pages/GroupContestsPage'))
const CreateGroupContestPage = lazy(() => import('@pages/CreateGroupContestPage'))
const GroupForumPage = lazy(() => import('@pages/GroupForumPage'))
const AdminConsolePage = lazy(() => import('@pages/AdminConsolePage'))
const SettingsPage = lazy(() => import('@pages/SettingsPage'))

function App() {
  const { isAuthenticated } = useAuthStore()
  const { setTheme, theme } = useSettingsStore()

  // Initialize theme on app load
  useEffect(() => {
    setTheme(theme)
  }, [])

  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/problems/:code/solve" element={<ProblemSolvingPage />} />
          <Route path="/problems/:code/contest/:contestId" element={<ProblemSolvingPage />} />
          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/contests/:id" element={<ContestDetailPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/join" element={<JoinGroupPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminConsolePage />} />
            <Route path="/admin/console" element={<AdminConsolePage />} />
            <Route path="/admin/create-problem" element={<CreateProblemPage />} />
            <Route path="/admin/edit-problem/:id" element={<EditProblemPage />} />
            <Route path="/admin/create-contest" element={<CreateContestPage />} />
            <Route path="/admin/edit-contest/:id" element={<EditContestPage />} />
            
            {/* Group Management Routes */}
            <Route path="/groups/create" element={<CreateGroupPage />} />
            <Route path="/groups/:id/edit" element={<EditGroupPage />} />
            <Route path="/groups/:id/manage" element={<GroupManagePage />} />
            <Route path="/groups/:id/moderate" element={<GroupModeratePage />} />
            <Route path="/groups/:id/members" element={<GroupMembersPage />} />
            <Route path="/groups/:id/contests" element={<GroupContestsPage />} />
            <Route path="/groups/:id/contests/create" element={<CreateGroupContestPage />} />
            <Route path="/groups/:id/forum" element={<GroupForumPage />} />
          </Route>

          {/* Catch all - 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App