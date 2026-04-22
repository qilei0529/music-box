import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { font } from '@/lib/font'

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
    <html lang="zh" className={`${font.variable} h-full`}>
      <body className={`${font.className} flex h-screen overflow-hidden antialiased bg-white text-gray-900`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-12 py-10">
          {children}
        </main>
      </body>
    </html>
  )
}
