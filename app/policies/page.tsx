'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PoliciesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/company-hub?tab=policies') }, [router])
  return null
}
