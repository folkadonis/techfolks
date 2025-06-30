import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'

type ApiError = {
  message: string
  statusCode: number
}

export function useApiQuery<TData = unknown>(
  key: string | string[],
  fetcher: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, AxiosError<ApiError>>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: fetcher,
    ...options,
  })
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, AxiosError<ApiError>, TVariables>,
) {
  return useMutation({
    mutationFn,
    onError: (error) => {
      const message = error.response?.data?.message || 'An error occurred'
      toast.error(message)
    },
    ...options,
  })
}