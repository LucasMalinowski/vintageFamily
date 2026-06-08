'use client'

import Image from 'next/image'

interface Props {
  displayed: string
  cursor: boolean
}

function Fireflies() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 18 }, (_, i) => {
        const seed = (i * 2654435761) >>> 0
        const r1 = ((seed ^ (seed >> 16)) * 0x45d9f3b) >>> 0
        const r2 = ((r1 ^ (r1 >> 16)) * 0x45d9f3b) >>> 0
        const r3 = ((r2 ^ (r2 >> 16)) * 0x45d9f3b) >>> 0
        const r4 = ((r3 ^ (r3 >> 16)) * 0x45d9f3b) >>> 0
        const r5 = ((r4 ^ (r4 >> 16)) * 0x45d9f3b) >>> 0
        const x   = (r1 / 0xFFFFFFFF) * 100
        const y   = (r2 / 0xFFFFFFFF) * 85
        const sz  = 2 + (r3 / 0xFFFFFFFF) * 3
        const pk  = 0.25 + (r4 / 0xFFFFFFFF) * 0.55
        const dur = 3000 + (r5 / 0xFFFFFFFF) * 4000
        const del = (r1 / 0xFFFFFFFF) * 5000
        return (
          <div
            key={i}
            className="absolute rounded-full bg-[#C2A45D]"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: sz,
              height: sz,
              boxShadow: `0 0 ${sz * 3}px ${sz * 1.5}px rgba(194,164,93,0.4)`,
              animation: `fw-firefly ${dur}ms ease-in-out ${del}ms infinite`,
              '--fw-peak': pk,
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}

export default function CalmaView({ displayed, cursor }: Props) {
  return (
    <div
      className="relative w-full flex flex-col items-center justify-center"
      style={{
        minHeight: 'calc(100vh - 90px)',
        background: 'linear-gradient(180deg, #3E5F4B 0%, #344e3f 50%, #2a4034 100%)',
      }}
    >
      {/* Diagonal stripe texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(194,164,93,0.04) 0 1px, transparent 1px 22px)',
        }}
      />

      {/* Fireflies */}
      <Fireflies />

      {/* Center stage */}
      <div className="relative z-10 flex flex-col items-center px-8" style={{ marginTop: '-32px' }}>
        {/* Logo with gold halo */}
        <div className="relative mb-4">
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '-60%',
              background: 'radial-gradient(circle, rgba(194,164,93,0.16) 0%, transparent 65%)',
            }}
          />
          <Image src="/logo.png" alt="Florim" width={72} height={72} className="relative opacity-90" />
        </div>

        {/* FLORIM wordmark */}
        <p className="font-serif text-[26px] mb-4" style={{ color: '#C2A45D', letterSpacing: '0.42em' }}>
          FLORIM
        </p>

        {/* Gold thread */}
        <div
          className="w-48 h-px mb-5"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(194,164,93,0.55), transparent)' }}
        />

        {/* Typewriter */}
        <p
          className="font-ptSerif italic text-[17px] text-center leading-relaxed min-h-[56px] max-w-lg"
          style={{ color: 'rgba(255,255,255,0.80)' }}
        >
          &ldquo;{displayed}
          <span
            className="inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-[#C2A45D] transition-opacity duration-100"
            style={{ opacity: cursor ? 1 : 0 }}
          />
          &rdquo;
        </p>
      </div>
    </div>
  )
}
