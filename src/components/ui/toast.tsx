import { toast as sonnerToast, Toaster } from 'sonner'
import { X } from 'lucide-react'

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast.info(message),
  warning: (message: string) => sonnerToast.warning(message),
  loading: (message: string) => sonnerToast.loading(message),
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string
      success: string
      error: string
    }
  ) => sonnerToast.promise(promise, options),
}

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        expand
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '12px 16px',
            fontSize: '14px',
          },
        }}
        icons={{
          close: <X size={16} />,
        }}
      />
    </>
  )
}

export { Toaster }