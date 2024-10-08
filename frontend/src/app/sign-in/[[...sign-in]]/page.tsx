import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'

export default function Page() {
  return (
    <div className="min-h-screen bg-n-8 text-n-1">
      <div className="flex items-center px-5 lg:px-7.5 xl:px-10 py-4">
        <a className="flex items-center w-[10rem] xl:mr-8" href="/">
          <Image src="/assets/lunaris.svg" width={45} height={45} alt="Lunaris" />
          <span className="ml-2 text-white text-2xl font-bold">Lunaris</span>
        </a>
      </div>
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <SignIn
          appearance={{
            elements: {
              rootBox: "bg-n-8",
              card: "bg-n-7 border-n-6",
              headerTitle: "text-n-1",
              headerSubtitle: "text-n-3",
              socialButtonsBlockButton: "bg-n-7 border-n-6 text-n-1 hover:bg-n-6",
              dividerLine: "bg-n-6",
              dividerText: "text-n-3",
              formFieldLabel: "text-n-3",
              formFieldInput: "bg-n-6 text-n-1 border-n-5",
              footerActionLink: "text-color-1 hover:text-color-1/80",
              formButtonPrimary: "bg-color-1 hover:bg-color-1/80 text-n-1",
              footer: "text-n-3",
              footerActionText: "text-n-3",
              identityPreviewText: "text-n-1",
              identityPreviewEditButton: "text-color-1 hover:text-color-1/80",
            },
          }}
        />
      </div>
    </div>
  )
}