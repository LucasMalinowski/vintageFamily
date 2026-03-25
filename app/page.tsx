'use client'

import PublicNavbar from '@/components/layout/PublicNavbar'

export default function Home() {
  return (
    <div className="min-h-screen bg-paper relative overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/main-video.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-black/10" />

      <PublicNavbar />
      <main className="relative z-0 min-h-screen" />
    </div>
  )
}
