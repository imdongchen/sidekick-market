'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo } from 'react'

interface SidekickQRCodeProps {
  value?: string
  size?: number
  className?: string
}

export function SidekickQRCode({
  value,
  size = 24,
  className = '',
}: SidekickQRCodeProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Generate URL for current review page if no value provided
  const qrValue = useMemo(() => {
    if (value) return value

    // Build the current page URL
    if (typeof window === 'undefined') {
      return 'https://sidekickswim.com'
    }

    const params = new URLSearchParams(searchParams.toString())
    const url = new URL(pathname, window.location.origin)
    url.search = params.toString()
    return url.toString()
  }, [value, pathname, searchParams])

  return (
    <div className={`inline-flex ${className}`}>
      <QRCodeSVG
        value={qrValue}
        size={size}
        level="M"
        marginSize={0}
        fgColor="#000000"
        bgColor="transparent"
      />
    </div>
  )
}
