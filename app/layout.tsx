import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/navbar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Market AI - 경쟁사 가격 분석',
  description: '병원 마케팅을 위한 경쟁사 가격 수집, 분석, 패키지 제안 시스템',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <main className="pt-14 min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-4 md:p-6">{children}</div>
        </main>
      </body>
    </html>
  )
}
