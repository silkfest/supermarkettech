import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'NOT SET'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return NextResponse.json({
    supabaseUrl: url,
    anonKeySet: !!anonKey,
    anonKeyPrefix: anonKey ? anonKey.substring(0, 30) + '...' : null,
    serviceKeySet: !!serviceKey,
    serviceKeyPrefix: serviceKey ? serviceKey.substring(0, 20) + '...' : null,
  })
}
