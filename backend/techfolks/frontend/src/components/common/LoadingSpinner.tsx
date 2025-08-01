import { cn } from '@utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary-600',
          sizeClasses[size],
          className,
        )}
      />
    </div>
  )
}

export default LoadingSpinner