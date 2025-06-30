import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const formatDate = (date: string | Date, formatString = 'PPp') => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatString)
}

export const formatRelativeTime = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num)
}

export const formatPercentage = (value: number, decimals = 1) => {
  return `${value.toFixed(decimals)}%`
}

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}