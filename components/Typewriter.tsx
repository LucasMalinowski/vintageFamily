'use client'

import { useEffect, useRef, useState } from 'react'

type Phase = 'idle' | 'typing' | 'pausing' | 'deleting' | 'between'

type TypewriterProps = {
  /** Single string or array of strings to cycle through. */
  texts: string | string[]
  /** Milliseconds per character while typing. Default 60. */
  speedMs?: number
  /** Milliseconds per character while deleting. Default 30. */
  deleteSpeedMs?: number
  /** Pause (ms) after finishing a string before deleting. Default 2800. */
  pauseMs?: number
  /** Brief pause (ms) between strings. Default 400. */
  betweenMs?: number
  /** Delay (ms) before the first character is typed. Default 0. */
  startDelay?: number
  /** Whether to loop forever. Default true. Has no effect for single strings — use loop=false to type once. */
  loop?: boolean
  /** className applied to the outer <span>. */
  className?: string
  /** Called once when a non-looping text has fully typed out. */
  onComplete?: () => void
}

export default function Typewriter({
  texts,
  speedMs = 60,
  deleteSpeedMs = 30,
  pauseMs = 2800,
  betweenMs = 400,
  startDelay = 0,
  loop = true,
  className,
  onComplete,
}: TypewriterProps) {
  const strings = Array.isArray(texts) ? texts : [texts]
  const single = strings.length === 1

  const [textIndex, setTextIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [visible, setVisible] = useState(false)
  const [done, setDone] = useState(false)

  const containerRef = useRef<HTMLSpanElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Respect prefers-reduced-motion
  const reducedRef = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Start only when element enters the viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if (reducedRef.current) {
      setCharIndex(strings[0].length)
      setPhase('pausing')
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Kick off after startDelay once visible
  useEffect(() => {
    if (!visible || phase !== 'idle') return
    if (startDelay <= 0) {
      setPhase('typing')
      return
    }
    const id = setTimeout(() => setPhase('typing'), startDelay)
    return () => clearTimeout(id)
  }, [visible, phase, startDelay])

  // Main state machine
  useEffect(() => {
    if (phase === 'idle' || done) return

    const currentText = strings[textIndex]
    let id: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (charIndex < currentText.length) {
        id = setTimeout(() => setCharIndex((c) => c + 1), speedMs)
      } else {
        // Finished typing
        if (!loop && single) {
          setDone(true)
          onCompleteRef.current?.()
          return
        }
        id = setTimeout(() => setPhase('pausing'), 0)
      }
    } else if (phase === 'pausing') {
      if (!loop && single) {
        setDone(true)
        onCompleteRef.current?.()
        return
      }
      id = setTimeout(() => setPhase(single && !loop ? 'pausing' : 'deleting'), pauseMs)
    } else if (phase === 'deleting') {
      if (charIndex > 0) {
        id = setTimeout(() => setCharIndex((c) => c - 1), deleteSpeedMs)
      } else {
        id = setTimeout(() => setPhase('between'), 0)
      }
    } else if (phase === 'between') {
      id = setTimeout(() => {
        setTextIndex((i) => (i + 1) % strings.length)
        setPhase('typing')
      }, betweenMs)
    }

    return () => clearTimeout(id)
  }, [phase, charIndex, textIndex, done, loop, single, strings, speedMs, deleteSpeedMs, pauseMs, betweenMs])

  const currentText = strings[textIndex]
  const displayed = currentText.slice(0, charIndex)

  return (
    <span ref={containerRef} aria-label={currentText} className={className}>
      {/* Preserve whitespace and newlines */}
      {displayed.split('\n').map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
      {/* Caret — always visible, uses global .typewriter-caret keyframe */}
      <span aria-hidden="true" className="typewriter-caret">|</span>
    </span>
  )
}
