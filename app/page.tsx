import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex items-baseline gap-0.5 justify-center mb-2">
          <span className="text-3xl font-bold text-blue-600">Cold</span>
          <span className="text-3xl font-bold text-slate-800">IQ</span>
        </div>
        <p className="text-sm text-slate-500 mb-8">
          AI-powered refrigeration expert for supermarket technicians
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="w-full py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Request access
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Major Refrigeration · majorrefrigeration.ca
        </p>
      </div>
    </div>
  )
}
