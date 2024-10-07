import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/shared/sidebar';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-n-8">
      <SignedIn>
        <Sidebar />
      </SignedIn>
      <SignedOut>
        <div className="w-full md:w-64 bg-n-7 text-n-1 p-6">
          <div className="flex items-center justify-between mb-8">
            <img src="/assets/lunaris.svg" alt="Lunaris" className="w-10 h-10" />
            <span className="font-bold text-2xl">Lunaris</span>
          </div>
          <div className="flex justify-center mt-6">
            <SignInButton mode="modal">
              <button className="bg-color-1 hover:bg-color-1/80 text-n-1 font-bold py-3 px-6 rounded-full transition-colors duration-200">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-n-8 md:pl-64 p-4">
        {children}
      </main>
    </div>
  );
}
