// Obaveštenja Montaže idu kroz obaveštenja Security dela (security/sx/toast): jedno na ekranu,
// ista poruka pravi brojač, greška ima prednost. Prikaz (ToastProvider) je u okviru Montaže u App.js.
import { toast as sx } from '../../security/sx/toast'

export const toast = {
  success: (message: string) => sx.ok(message),
  error: (message: string) => sx.bad(message),
  info: (message: string) => sx.info(message),
  warning: (message: string, _options?: unknown) => sx.warn(message),
  warn: (message: string) => sx.warn(message),
}
