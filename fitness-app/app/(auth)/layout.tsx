import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-td-blue-dark via-td-blue-text to-td-blue-display flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="bg-white p-3 rounded-xl group-hover:scale-110 transition-transform">
              <Dumbbell className="w-8 h-8 text-td-cta-orange" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-headings font-bold text-white">
                TD FITNESS
              </h1>
              <p className="text-sm text-white/80 font-body">
                Consultoria Online
              </p>
            </div>
          </Link>
        </div>

        {/* Auth Content */}
        {children}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-white/70 text-sm">
            &copy; {new Date().getFullYear()} Treinador David. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
