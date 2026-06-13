import { useState, useEffect } from 'react'

export default function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )
  useEffect(() => {
    const h = () => setWidth(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return {
    isMobile:          width < 768,
    isTablet:          width >= 768 && width < 1024,
    isMobileOrTablet:  width < 1024,
  }
}
