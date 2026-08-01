import { useEffect, useRef, useState } from 'react'

/* ── Blood Cell Canvas Animation ──────────────────────────── */
function BloodCellCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight
    let animId

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    /* Generate blood cells */
    const cells = Array.from({ length: 38 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 14 + Math.random() * 26,        // radius 14–40
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      opacity: 0.07 + Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2, // for pulsing
      speed: 0.008 + Math.random() * 0.012,
      tilt: Math.random() * Math.PI,
    }))

    function drawCell(x, y, r, opacity, phase, tilt) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(tilt)

      const pulse = 1 + 0.06 * Math.sin(phase)
      const rx = r * pulse
      const ry = r * 0.62 * pulse  // biconcave disc shape

      // Outer glow
      const grd = ctx.createRadialGradient(0, 0, ry * 0.1, 0, 0, rx * 1.25)
      grd.addColorStop(0, `rgba(180, 10, 30, ${opacity * 0.25})`)
      grd.addColorStop(1, `rgba(120, 0, 18, 0)`)
      ctx.beginPath()
      ctx.ellipse(0, 0, rx * 1.25, ry * 1.25, 0, 0, Math.PI * 2)
      ctx.fillStyle = grd
      ctx.fill()

      // Cell body
      ctx.beginPath()
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(160, 4, 26, ${opacity * 0.55})`
      ctx.fill()

      // Biconcave indent — darker centre
      ctx.beginPath()
      ctx.ellipse(0, 0, rx * 0.52, ry * 0.52, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(80, 0, 12, ${opacity * 0.65})`
      ctx.fill()

      // Highlight rim
      ctx.beginPath()
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(220, 60, 80, ${opacity * 0.4})`
      ctx.lineWidth = 1.2
      ctx.stroke()

      // Subtle inner highlight
      ctx.beginPath()
      ctx.ellipse(-rx * 0.18, -ry * 0.22, rx * 0.3, ry * 0.18, -0.4, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 120, 140, ${opacity * 0.18})`
      ctx.fill()

      ctx.restore()
    }

    function draw(t) {
      ctx.clearRect(0, 0, width, height)

      cells.forEach(c => {
        c.x += c.vx
        c.y += c.vy
        c.phase += c.speed
        c.tilt += 0.001

        // Wrap around edges
        if (c.x < -c.r * 2) c.x = width + c.r
        if (c.x > width + c.r * 2) c.x = -c.r
        if (c.y < -c.r * 2) c.y = height + c.r
        if (c.y > height + c.r * 2) c.y = -c.r

        drawCell(c.x, c.y, c.r, c.opacity, c.phase, c.tilt)
      })

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ── DNA Helix SVG icon ─────────────────────────────────────── */
function HormoneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Stylised hormone/molecule icon */}
      <circle cx="14" cy="14" r="5.5" stroke="white" strokeWidth="1.8" fill="none" opacity="0.9"/>
      <circle cx="14" cy="14" r="2" fill="white" opacity="0.95"/>
      {/* orbital arcs */}
      <ellipse cx="14" cy="14" rx="12" ry="5" stroke="white" strokeWidth="1.3" fill="none" opacity="0.55"/>
      <ellipse cx="14" cy="14" rx="12" ry="5" stroke="white" strokeWidth="1.3" fill="none" opacity="0.55"
        transform="rotate(60 14 14)"/>
      <ellipse cx="14" cy="14" rx="12" ry="5" stroke="white" strokeWidth="1.3" fill="none" opacity="0.55"
        transform="rotate(120 14 14)"/>
    </svg>
  )
}

/* ── Main Splash Page ────────────────────────────────────────── */
export default function SplashPage({ onStart }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Fade in on mount
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleStart = () => {
    setExiting(true)
    setTimeout(() => onStart?.(), 800)
  }

  return (
    <div
      id="splash-page"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse at 40% 30%, #7a0014 0%, #3d0008 40%, #1a0004 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: exiting ? 0 : visible ? 1 : 0,
        transition: exiting ? 'opacity 0.75s ease-in' : 'opacity 0.7s ease-out',
      }}
    >
      {/* Blood cell canvas layer */}
      <BloodCellCanvas />

      {/* Vignette overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(10,0,2,0.55) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          textAlign: 'center',
          padding: '0 1.5rem',
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.9s ease-out 0.1s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s',
        }}
      >
        {/* Logo mark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          {/* Pulse ring logo */}
          <div style={{ position: 'relative', width: 88, height: 88 }}>
            {/* Outer pulse ring */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '1.5px solid rgba(220, 60, 80, 0.35)',
              animation: 'splashRing 2.8s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: '8px', borderRadius: '50%',
              border: '1.5px solid rgba(220, 60, 80, 0.25)',
              animation: 'splashRing 2.8s ease-out 0.7s infinite',
            }} />
            {/* Core circle */}
            <div style={{
              position: 'absolute', inset: '16px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #c0182e 0%, #7a0014 100%)',
              boxShadow: '0 0 32px rgba(192, 24, 46, 0.6), 0 0 64px rgba(120, 0, 20, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Drop / cell SVG */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M16 4 C16 4 6 16 6 21 a10 10 0 0 0 20 0 C26 16 16 4 16 4Z"
                  fill="white" opacity="0.92"/>
                <ellipse cx="16" cy="21" rx="5" ry="3.2" fill="rgba(180,0,20,0.55)"/>
              </svg>
            </div>
          </div>

          {/* App name */}
          <div style={{ marginTop: '0.25rem' }}>
            <h1 style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 'clamp(2.8rem, 8vw, 4.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: '#fff',
              textShadow: '0 2px 24px rgba(200, 20, 40, 0.5)',
            }}>
              Balance<span style={{ color: '#f87a8a', fontStyle: 'italic' }}>Cycle</span>
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              fontSize: '0.64rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,200,210,0.65)',
              marginTop: '0.4rem',
            }}>
              Hormonal Wellness Companion
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          fontWeight: 400,
          fontStyle: 'italic',
          color: 'rgba(255, 210, 215, 0.75)',
          maxWidth: '360px',
          lineHeight: 1.6,
        }}>
          Track your cycle, decode your hormones,<br />
          reclaim your rhythm.
        </p>

        {/* Start button */}
        <button
          id="splash-start-btn"
          onClick={handleStart}
          aria-label="Begin your BalanceCycle journey"
          style={{
            marginTop: '0.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 2.4rem',
            borderRadius: '9999px',
            border: '1.5px solid rgba(255,255,255,0.22)',
            background: 'linear-gradient(135deg, rgba(192,24,46,0.9) 0%, rgba(110,3,17,0.95) 100%)',
            color: '#fff',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '1.05rem',
            fontWeight: 600,
            letterSpacing: '0.03em',
            cursor: 'pointer',
            boxShadow: '0 4px 32px rgba(192, 24, 46, 0.55), 0 0 0 0 rgba(192,24,46,0.4)',
            animation: 'btnPulse 2.4s ease-in-out infinite',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.06)'
            e.currentTarget.style.boxShadow = '0 6px 40px rgba(192, 24, 46, 0.7), 0 0 0 0 rgba(192,24,46,0.3)'
            e.currentTarget.style.background = 'linear-gradient(135deg, #d41e36 0%, #8a0216 100%)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 32px rgba(192, 24, 46, 0.55), 0 0 0 0 rgba(192,24,46,0.4)'
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(192,24,46,0.9) 0%, rgba(110,3,17,0.95) 100%)'
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.06)' }}
        >
          <HormoneIcon />
          Begin Your Journey
        </button>

        {/* Bottom hint */}
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(255,180,190,0.35)',
          marginTop: '-0.5rem',
        }}>
          Your data stays on your device
        </p>
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes splashRing {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 4px 32px rgba(192,24,46,0.55), 0 0 0 0px rgba(192,24,46,0.35); }
          50%       { box-shadow: 0 4px 32px rgba(192,24,46,0.55), 0 0 0 10px rgba(192,24,46,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes splashRing { from {} to {} }
          @keyframes btnPulse   { from {} to {} }
        }
      `}</style>
    </div>
  )
}
