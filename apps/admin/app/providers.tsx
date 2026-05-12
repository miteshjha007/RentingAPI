'use client'

import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background:   '#1a1a1a',
            border:       '1px solid #2c2c30',
            color:        '#f9f9f9',
            borderRadius: '12px',
            fontSize:     '14px',
          },
          duration: 4000,
        }}
      />
    </>
  )
}
