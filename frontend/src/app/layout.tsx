import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import './globals.css'

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
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}