import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GolfGive — Play. Win. Give.',
  description: 'The subscription golf platform where your game funds charities and wins prizes. Enter scores, join monthly draws, and make a real difference.',
  keywords: 'golf, charity, subscription, prize draw, Stableford',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-charcoal-950 font-body">
        {children}
      </body>
    </html>
  )
}
