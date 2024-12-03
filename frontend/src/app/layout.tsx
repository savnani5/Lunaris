import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import './globals.css'
import type { Metadata } from 'next'
import { CSPostHogProvider } from './providers'


export const metadata: Metadata = {
  title: 'Lunaris',
  description: 'AI-powered video content creation',
  icons: {
    icon: [
      {
        url: '/assets/lunaris.svg',
        type: 'image/svg+xml',
      }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider 
      afterSignInUrl="/auto"
      afterSignUpUrl="/auto"
      afterSignOutUrl="/"
      appearance={{ variables: { colorPrimary: '#8B5CF6' }, baseTheme: dark }}
    >
      <html lang="en">
        <CSPostHogProvider>
          <head />
          <body>
            {children}
          </body>
        </CSPostHogProvider>
      </html>
    </ClerkProvider>
  )
}