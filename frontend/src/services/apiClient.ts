import axios from 'axios'
import { supabase } from './supabase'
import type { ApiResponse } from '../types/api'

const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '')

export const api = axios.create({ baseURL: `${base}/v1`, timeout: 20000 })

api.interceptors.request.use(async (config) => {
  const session = (await supabase?.auth.getSession())?.data.session
  if (session?.access_token) config.headers.Authorization = `Bearer ${session.access_token}`
  return config
})

export async function getData<T>(path: string): Promise<T> {
  const response = await api.get<ApiResponse<T>>(path)
  return response.data.data
}

export async function postData<T>(path: string, body: unknown): Promise<T> {
  const response = await api.post<ApiResponse<T>>(path, body)
  return response.data.data
}

export async function putData<T>(path: string, body: unknown): Promise<T> {
  const response = await api.put<ApiResponse<T>>(path, body)
  return response.data.data
}

export async function patchData<T>(path: string, body: unknown): Promise<T> {
  const response = await api.patch<ApiResponse<T>>(path, body)
  return response.data.data
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.errorCode || error.message
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi.'
}
