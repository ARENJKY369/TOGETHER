import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'

export function triggerConfetti() {
  const colors = ['#FFB3BB', '#FFDAB7', '#C86B7A', '#FF8FA0', '#FFF7EE']
  confetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.65 },
    colors,
    scalar: 1.2,
    ticks: 200,
    gravity: 0.9,
    drift: 0.2,
  })
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { y: 0.6, x: 0.2 },
      colors,
    })
    confetti({
      particleCount: 60,
      spread: 120,
      origin: { y: 0.6, x: 0.8 },
      colors,
    })
  }, 200)
}

export function HeartBurst({ x, y, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
  }, [onDone])
  const hearts = ['💖','💕','💗','💓','💞','✨']
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="heart-burst"
          style={{
            left: x + (Math.random()*80-40),
            top: y + (Math.random()*40-20),
            animationDelay: `${i*60}ms`,
            fontSize: `${18 + Math.random()*14}px`,
          }}
        >
          {hearts[i % hearts.length]}
        </span>
      ))}
    </>
  )
}

export default function ConfettiOverlay() {
  return null // using canvas-confetti directly
}
