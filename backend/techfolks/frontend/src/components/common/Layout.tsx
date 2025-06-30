import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { cn } from '@utils/cn'
import ThemeToggle from '@components/settings/ThemeToggle'

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
    { name: 'Groups', href: '/groups', show: isAuthenticated },
    { name: 'Leaderboard', href: '/leaderboard', show: true },
    { name: 'Dashboard', href: '/dashboard', show: isAuthenticated },
    { name: 'Settings', href: '/settings', show: isAuthenticated },
    { name: 'Admin', href: '/admin', show: isAuthenticated && user?.role === 'admin' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-primary">
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
                          'inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors',
                          isActive(item.href)
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
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
              {/* Theme Toggle (always visible) */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              
              {isAuthenticated && user ? (
                <>
                  <Link
                    to="/profile"
                    className="text-sm text-foreground hover:text-primary transition-colors"
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
                    className="text-sm text-foreground hover:text-primary transition-colors"
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
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} TechFolks. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout