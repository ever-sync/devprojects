import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { SWRegister } from '@/components/pwa/SWRegister'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ReobotLabs - Portal do Cliente',
  description: 'Acompanhe o progresso do seu projeto em tempo real.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'ReobotLabs',
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className={`${geist.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
        <SWRegister />
        <InstallPrompt />
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
