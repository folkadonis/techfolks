import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { cn } from '@utils/cn'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()

  const navigation = [
    { name: 'Home', href: '/', show: true },
    { name: 'Problems', href: '/problems', show: true },
    { name: 'Contests', href: '/contests', show: true },
    { name: 'Leaderboard', href: '/leaderboard', show: true },
    { name: 'Dashboard', href: '/dashboard', show: isAuthenticated },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  TechFolks
                </span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navigation.map(
                  (item) =>
                    item.show && (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2',
                          isActive(item.href)
                            ? 'border-primary-500 text-gray-900 dark:text-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                        )}
                      >
                        {item.name}
                      </Link>
                    ),
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <>
                  <Link
                    to="/profile"
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    {user.username}
                  </Link>
                  <button
                    onClick={logout}
                    className="btn btn-outline px-4 py-2 text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-primary px-4 py-2 text-sm"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} TechFolks. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout