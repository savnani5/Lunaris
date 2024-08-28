import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'
import lunarisLogo from "@/assets/lunaris_solid.svg";
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body>
          <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={lunarisLogo.src} width={40} height={40} alt="Lunaris" />
              <span style={{ marginLeft: '0.5rem', fontWeight: 'bold', fontSize: '1.25rem' }}>Lunaris</span>
            </div>
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </nav>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}