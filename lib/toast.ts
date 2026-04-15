import { toast } from 'sonner'

const baseStyle = {
  background: '#0E1E35',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
}

export const notify = {
  success: (message: string) =>
    toast.success(message, {
      style: { ...baseStyle, borderColor: 'rgba(37,99,235,0.3)' },
    }),
  error: (message: string) =>
    toast.error(message, {
      style: { ...baseStyle, borderColor: 'rgba(239,68,68,0.3)' },
    }),
  loading: (message: string) =>
    toast.loading(message, { style: baseStyle }),
  info: (message: string) =>
    toast(message, { style: baseStyle }),
}
