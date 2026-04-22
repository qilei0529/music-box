import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Music Box — 钢琴入门',
  description: '交互式钢琴学习网站，边听边学',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex h-screen overflow-hidden antialiased bg-white text-gray-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-12 py-10">
          {children}
        </main>
      </body>
    </html>
  )
}
