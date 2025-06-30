import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuthStore()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)

  const reservedUsernames = ['admin', 'administrator', 'root', 'system', 'support', 'help', 'api', 'www', 'mail', 'ftp']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (formData.username.length < 3) {
      toast.error('Username must be at least 3 characters long')
      return
    }

    if (reservedUsernames.includes(formData.username.toLowerCase())) {
      toast.error('This username is reserved and cannot be used')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      toast.error('Username can only contain letters, numbers, underscores, and hyphens')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      
      // Check if username already exists
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      if (existingUsers.find((u: any) => u.username.toLowerCase() === formData.username.toLowerCase())) {
        toast.error('Username already exists')
        return
      }

      if (existingUsers.find((u: any) => u.email.toLowerCase() === formData.email.toLowerCase())) {
        toast.error('Email already registered')
        return
      }

      // Create new user
      const newUser = {
        id: Date.now(),
        username: formData.username,
        email: formData.email,
        password: formData.password, // In real app, this would be hashed
        role: 'user',
        rating: 1200,
        max_rating: 1200,
        problems_solved: 0,
        created_at: new Date().toISOString()
      }

      // Save to localStorage
      const users = [...existingUsers, newUser]
      localStorage.setItem('users', JSON.stringify(users))

      // Register and login
      register(newUser)
      toast.success('Registration successful!')
      navigate('/dashboard')
      
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground">Create Account</h2>
          <p className="text-muted-foreground mt-2">
            Join TechFolks and start coding!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className="input w-full"
              placeholder="Enter your username"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              3+ characters, letters, numbers, underscores, and hyphens only
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input w-full"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="input w-full"
              placeholder="Enter your password"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 6 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input w-full"
              placeholder="Confirm your password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>

        {/* Reserved Username Notice */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            Note: Some usernames like 'admin', 'administrator', 'root', etc. are reserved and cannot be used.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage