import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

/** { showToast({ message, icon?, iconColor?, success? }), showError(message, { network? }) } */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return toast;
}
