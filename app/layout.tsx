import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Gardenn — repositório de ideias',
  description: 'Um jardim de referências e ideias que floresce a cada novo link, imagem, texto ou vídeo adicionado.',
  openGraph: {
    title: 'Gardenn',
    description: 'Um jardim de referências e ideias.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-bg text-ink font-sans min-h-screen">{children}</body>
    </html>
  )
}
