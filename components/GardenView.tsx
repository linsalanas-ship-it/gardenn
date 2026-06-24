'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Reference } from '@/lib/types'

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function seededRng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0x100000000 }
}

// ── Neon palette ──────────────────────────────────────────────────────────────

const PALETTE: Record<string, [string, string, string, string]> = {
  // [stem,       leaf,      flower,    glow]
  'manifesto':         ['#C77DFF', '#00E676', '#FF1744', '#FF80AB'],
  'identidade-verbal': ['#7C4DFF', '#69F0AE', '#FF9100', '#FFD740'],
  'copywriting':       ['#00BFA5', '#B9F6CA', '#00E5FF', '#84FFFF'],
  'poesia':            ['#AA00FF', '#76FF03', '#E040FB', '#EA80FC'],
  'email':             ['#448AFF', '#CCFF90', '#40C4FF', '#82B1FF'],
  'naming':            ['#FF6D00', '#B9F6CA', '#FF3D00', '#FF9E80'],
  'ooh':               ['#F50057', '#69F0AE', '#D500F9', '#FF80AB'],
}
const DEFAULT_PAL = PALETTE['poesia']

// ── Plant data ────────────────────────────────────────────────────────────────

type PlantData = {
  ref: Reference
  x: number; groundY: number; scale: number
  height: number; lean: number; archetype: number
  animDelay: number; animDuration: number
  leafPositions: { t: number; side: -1 | 1; w: number; h: number }[]
  flowerR: number; petalCount: number
  blobs: { dx: number; dy: number; r: number }[]
  layer: number // 0=back(blurry), 1=mid, 2=front
}

function buildPlant(ref: Reference, x: number, groundY: number, scale: number, layer: number): PlantData {
  const rng = seededRng(ref.id)
  const archetype = Math.floor(rng() * 3)
  const height = (70 + rng() * 120) * scale
  const lean = (rng() - 0.5) * 60
  const leafCount = 1 + Math.floor(rng() * 3)
  const leafPositions = Array.from({ length: leafCount }, () => ({
    t: 0.25 + rng() * 0.55,
    side: (rng() > 0.5 ? 1 : -1) as -1 | 1,
    w: (14 + rng() * 22) * scale,
    h: (7 + rng() * 11) * scale,
  }))
  const flowerR = (14 + rng() * 22) * scale
  const petalCount = 5 + Math.floor(rng() * 5)
  const blobCount = 4 + Math.floor(rng() * 5)
  const blobs = Array.from({ length: blobCount }, () => ({
    dx: (rng() - 0.5) * flowerR * 3.2,
    dy: (rng() - 0.5) * flowerR * 2,
    r: flowerR * (0.3 + rng() * 0.8),
  }))
  return {
    ref, x, groundY, scale, height, lean, archetype, layer,
    animDelay: rng() * 6, animDuration: 3 + rng() * 4,
    leafPositions, flowerR, petalCount, blobs,
  }
}

// ── Single plant ──────────────────────────────────────────────────────────────

function Plant({ plant, hovered, onClick, onHover }: {
  plant: PlantData; hovered: boolean
  onClick: () => void; onHover: (id: string | null) => void
}) {
  const [stem, leaf, flower, glow] = PALETTE[plant.ref.category] ?? DEFAULT_PAL
  const { x, groundY, height, lean, leafPositions, flowerR, petalCount, blobs, animDelay, animDuration, archetype, layer } = plant

  const tipX = x + lean * 0.4
  const tipY = groundY - height
  const ctrlX = x + lean * 0.88
  const ctrlY = groundY - height * 0.5

  const bloomFilterId = layer === 0 ? 'bloomFar' : hovered ? 'bloomHot' : 'bloomMid'
  const stemOpacity = layer === 0 ? 0.35 : 0.65

  return (
    <g
      style={{
        transformOrigin: `${x}px ${groundY}px`,
        animation: `plantSway ${animDuration}s ease-in-out ${animDelay}s infinite alternate`,
        cursor: 'pointer',
      }}
      onMouseEnter={() => onHover(plant.ref.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* Stem — hair-thin */}
      <path
        d={`M ${x} ${groundY} Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
        stroke={stem}
        strokeWidth={layer === 0 ? 0.7 : 1.2}
        fill="none"
        strokeLinecap="round"
        opacity={stemOpacity}
      />

      {/* Leaves */}
      {leafPositions.map((lp, i) => {
        const lx = x + lean * 0.88 * lp.t
        const ly = groundY - height * lp.t
        return (
          <ellipse key={i}
            cx={lx + lp.side * lp.w * 0.5}
            cy={ly - lp.h * 0.1}
            rx={lp.w * 0.5} ry={lp.h * 0.35}
            fill={leaf}
            transform={`rotate(${lp.side * 40}, ${lx}, ${ly})`}
            opacity={layer === 0 ? 0.25 : 0.55}
            filter={layer === 0 ? 'url(#bloomFar)' : undefined}
          />
        )
      })}

      {/* Flower glow halo */}
      <circle cx={tipX} cy={tipY}
        r={flowerR * (hovered ? 3.5 : 2.2)}
        fill={glow}
        opacity={layer === 0 ? 0.06 : hovered ? 0.22 : 0.1}
        filter="url(#softGlow)"
      />

      {/* Archetype 0: circle bloom */}
      {archetype === 0 && (
        <g filter={`url(#${bloomFilterId})`}>
          <circle cx={tipX} cy={tipY} r={flowerR} fill={flower}
            opacity={layer === 0 ? 0.45 : 0.85} />
          <circle cx={tipX} cy={tipY} r={flowerR * 0.35} fill={glow}
            opacity={layer === 0 ? 0.5 : 0.9} />
        </g>
      )}

      {/* Archetype 1: petals */}
      {archetype === 1 && (
        <g filter={`url(#${bloomFilterId})`}>
          {Array.from({ length: petalCount }, (_, i) => {
            const deg = (i / petalCount) * 360
            const rad = (deg * Math.PI) / 180
            const px = tipX + Math.cos(rad) * flowerR * 0.75
            const py = tipY + Math.sin(rad) * flowerR * 0.75
            return (
              <ellipse key={i} cx={px} cy={py}
                rx={flowerR * 0.55} ry={flowerR * 0.27}
                fill={flower}
                transform={`rotate(${deg}, ${px}, ${py})`}
                opacity={layer === 0 ? 0.4 : 0.82}
              />
            )
          })}
          <circle cx={tipX} cy={tipY} r={flowerR * 0.38} fill={glow}
            opacity={layer === 0 ? 0.5 : 0.95} />
        </g>
      )}

      {/* Archetype 2: blob cluster */}
      {archetype === 2 && (
        <g filter={`url(#${bloomFilterId})`}>
          {blobs.map((b, i) => (
            <circle key={i}
              cx={tipX + b.dx} cy={tipY + b.dy} r={b.r}
              fill={i % 2 === 0 ? flower : glow}
              opacity={layer === 0 ? 0.3 : 0.68 + i * 0.015}
            />
          ))}
        </g>
      )}

      {/* Hover label */}
      {hovered && (
        <text x={tipX} y={tipY - flowerR - 12}
          textAnchor="middle" fontSize={11}
          fontFamily="system-ui, sans-serif" fontWeight="500"
          fill={glow} opacity={0.95}
          style={{ pointerEvents: 'none', letterSpacing: '0.05em' }}
        >
          {plant.ref.brand_name}
        </text>
      )}
    </g>
  )
}

// ── Connection vines ──────────────────────────────────────────────────────────

function Connections({ plants }: { plants: PlantData[] }) {
  const pairs = useMemo(() => {
    const result: Array<{ a: PlantData; b: PlantData; key: string }> = []
    const perPlant = new Map<string, number>()
    for (let i = 0; i < plants.length; i++) {
      for (let j = i + 1; j < plants.length; j++) {
        const ta = plants[i].ref.tags ?? []
        const tb = plants[j].ref.tags ?? []
        if (!ta.some(t => tb.includes(t))) continue
        const ia = perPlant.get(plants[i].ref.id) ?? 0
        const ib = perPlant.get(plants[j].ref.id) ?? 0
        if (ia >= 3 || ib >= 3) continue
        result.push({ a: plants[i], b: plants[j], key: `${i}-${j}` })
        perPlant.set(plants[i].ref.id, ia + 1)
        perPlant.set(plants[j].ref.id, ib + 1)
      }
    }
    return result
  }, [plants])

  return (
    <g>
      {pairs.map(({ a, b, key }) => {
        const ax = a.x + a.lean * 0.4, ay = a.groundY - a.height
        const bx = b.x + b.lean * 0.4, by = b.groundY - b.height
        const mx = (ax + bx) / 2, my = Math.min(ay, by) - 30
        return (
          <path key={key}
            d={`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`}
            stroke="#C77DFF" strokeWidth={0.7} fill="none"
            opacity={0.2} strokeDasharray="2 6"
          />
        )
      })}
    </g>
  )
}

// ── Floating particles ────────────────────────────────────────────────────────

function Particles({ W, H }: { W: number; H: number }) {
  const dots = useMemo(() => {
    const rng = seededRng('particles-v2')
    const neonDots = ['#FF1744','#E040FB','#00E5FF','#69F0AE','#FF9100','#40C4FF','#FF80AB','#FFD740']
    return Array.from({ length: 55 }, (_, i) => ({
      cx: rng() * W,
      cy: rng() * H * 0.85,
      r: 0.8 + rng() * 2.5,
      color: neonDots[i % neonDots.length],
      animDur: 4 + rng() * 8,
      animDelay: rng() * 6,
      dy: 8 + rng() * 20,
    }))
  }, [W, H])

  return (
    <g opacity={0.55}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.color}
          filter="url(#softGlow)"
          style={{ animation: `float ${d.animDur}s ease-in-out ${d.animDelay}s infinite alternate` }}
        />
      ))}
    </g>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const W = 1600
const H = 740
const GROUND_Y = 580

export default function GardenView({ references }: { references: Reference[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return references
    const q = query.toLowerCase()
    return references.filter(r =>
      r.brand_name.toLowerCase().includes(q) ||
      (r.content ?? '').toLowerCase().includes(q) ||
      (r.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
      (r.industry ?? '').toLowerCase().includes(q)
    )
  }, [references, query])

  const scale = Math.max(0.42, 1.0 - Math.max(0, filtered.length - 5) * 0.011)

  const plants = useMemo(() => {
    const n = filtered.length
    if (n === 0) return []
    const margin = 80
    const slot = (W - margin * 2) / Math.max(n, 1)
    return filtered.map((ref, i) => {
      const rng = seededRng(ref.id + 'pos2')
      const baseX = margin + slot * i + slot * 0.5
      const x = Math.max(55, Math.min(W - 55, baseX + (rng() - 0.5) * slot * 0.55))
      const gY = GROUND_Y + (rng() - 0.5) * 30
      const layer = Math.floor(rng() * 3) as 0 | 1 | 2
      return buildPlant(ref, x, gY, scale, layer)
    })
  }, [filtered, scale])

  // Render back layers first, front last
  const byLayer = useMemo(() => ({
    back: plants.filter(p => p.layer === 0 && p.ref.id !== hoveredId),
    mid:  plants.filter(p => p.layer === 1 && p.ref.id !== hoveredId),
    front: plants.filter(p => p.layer === 2 && p.ref.id !== hoveredId),
    hov:  plants.filter(p => p.ref.id === hoveredId),
  }), [plants, hoveredId])

  const handleClick = useCallback((slug: string) => {
    window.location.href = `/ref/${slug}`
  }, [])

  return (
    <div className="gv-root">
      {/* Header */}
      <div className="gv-header">
        <Link href="/garden" className="gv-logo">GARDENN</Link>
        <span className="gv-count">
          {filtered.length === references.length
            ? `${references.length} ideia${references.length !== 1 ? 's' : ''}`
            : `${filtered.length} / ${references.length}`}
        </span>
        <Link href="/admin" className="gv-admin">admin →</Link>
      </div>

      {/* Canvas */}
      <div className="gv-canvas-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet" className="gv-svg">
          <defs>
            {/* Bloom filters */}
            <filter id="bloomFar" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="bloomMid" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="bloomHot" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="b2" />
              <feMerge><feMergeNode in="b1"/><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="softGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>

            {/* Background gradients */}
            <radialGradient id="bgGlow1" cx="30%" cy="40%" r="45%">
              <stop offset="0%" stopColor="#6B21A8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0F0A1A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bgGlow2" cx="75%" cy="60%" r="40%">
              <stop offset="0%" stopColor="#064E3B" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0F0A1A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bgGlow3" cx="55%" cy="20%" r="35%">
              <stop offset="0%" stopColor="#831843" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0F0A1A" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bgMain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#0D0A18" />
              <stop offset="60%"  stopColor="#111520" />
              <stop offset="100%" stopColor="#0A1A12" />
            </linearGradient>
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#0D2B1A" />
              <stop offset="100%" stopColor="#050E08" />
            </linearGradient>

            {/* Mist overlay */}
            <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1A0E2E" stopOpacity="0" />
              <stop offset="70%"  stopColor="#1A0E2E" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0D1F14" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width={W} height={H} fill="url(#bgMain)" />
          <rect width={W} height={H} fill="url(#bgGlow1)" />
          <rect width={W} height={H} fill="url(#bgGlow2)" />
          <rect width={W} height={H} fill="url(#bgGlow3)" />

          {/* Ground */}
          <path
            d={`M 0 ${GROUND_Y - 10} Q ${W*0.3} ${GROUND_Y - 28} ${W*0.6} ${GROUND_Y - 15} Q ${W*0.8} ${GROUND_Y - 5} ${W} ${GROUND_Y - 12} L ${W} ${H} L 0 ${H} Z`}
            fill="url(#groundGrad)"
          />

          {/* Particles */}
          <Particles W={W} H={H} />

          {/* Connection vines */}
          <Connections plants={plants} />

          {/* Plants — layered for depth */}
          {byLayer.back.map(p => (
            <Plant key={p.ref.id} plant={p} hovered={false}
              onClick={() => handleClick(p.ref.slug)} onHover={setHoveredId} />
          ))}
          {byLayer.mid.map(p => (
            <Plant key={p.ref.id} plant={p} hovered={false}
              onClick={() => handleClick(p.ref.slug)} onHover={setHoveredId} />
          ))}
          {byLayer.front.map(p => (
            <Plant key={p.ref.id} plant={p} hovered={false}
              onClick={() => handleClick(p.ref.slug)} onHover={setHoveredId} />
          ))}
          {byLayer.hov.map(p => (
            <Plant key={p.ref.id} plant={p} hovered
              onClick={() => handleClick(p.ref.slug)} onHover={setHoveredId} />
          ))}

          {/* Mist overlay */}
          <rect width={W} height={H} fill="url(#mistGrad)" style={{ pointerEvents: 'none' }} />

          {/* Empty state */}
          {plants.length === 0 && (
            <text x={W / 2} y={GROUND_Y - 80} textAnchor="middle"
              fontSize={14} fontFamily="system-ui, sans-serif"
              fill="#C77DFF" opacity={0.5} letterSpacing="0.08em">
              o jardim está vazio — adicione ideias no admin
            </text>
          )}
        </svg>
      </div>

      {/* Floating search bar */}
      <div className="gv-bar-wrap">
        <div className="gv-bar">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="gv-search-icon">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} className="gv-input"
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="buscar por nome, tema, tag…" />
          {query && (
            <button className="gv-clear" onClick={() => setQuery('')} aria-label="Limpar">×</button>
          )}
          <Link href="/admin/nova" className="gv-add" title="Plantar nova ideia">+</Link>
        </div>
      </div>

      <style jsx>{`
        .gv-root {
          min-height: 100vh;
          background: #0D0A18;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .gv-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 44px;
          background: rgba(13, 10, 24, 0.75);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(199, 125, 255, 0.12);
        }
        .gv-logo {
          font-size: 11px; font-weight: 700; letter-spacing: 0.22em;
          color: #C77DFF; text-decoration: none; text-transform: uppercase;
        }
        .gv-count {
          font-size: 11px; color: rgba(199,125,255,0.4); letter-spacing: 0.06em;
        }
        .gv-admin {
          font-size: 11px; color: rgba(199,125,255,0.4); text-decoration: none;
          letter-spacing: 0.06em; transition: color 0.2s;
        }
        .gv-admin:hover { color: #C77DFF; }
        .gv-canvas-wrap {
          flex: 1; display: flex; align-items: flex-end; padding-top: 44px;
        }
        .gv-svg {
          width: 100%; height: calc(100vh - 44px); display: block;
        }
        .gv-bar-wrap {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 50;
        }
        .gv-bar {
          display: flex; align-items: center; gap: 10px;
          background: rgba(20, 12, 36, 0.88);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(199, 125, 255, 0.2);
          border-radius: 40px; padding: 10px 16px;
          box-shadow: 0 0 30px rgba(199,125,255,0.12), 0 4px 20px rgba(0,0,0,0.4);
          min-width: 320px;
        }
        .gv-search-icon { color: rgba(199,125,255,0.5); flex-shrink: 0; }
        .gv-input {
          flex: 1; border: none; outline: none;
          font-size: 13px; color: rgba(255,255,255,0.8);
          background: transparent; min-width: 0; letter-spacing: 0.02em;
        }
        .gv-input::placeholder { color: rgba(199,125,255,0.3); }
        .gv-clear {
          background: none; border: none; cursor: pointer;
          color: rgba(199,125,255,0.4); font-size: 17px;
          line-height: 1; padding: 0; flex-shrink: 0;
        }
        .gv-clear:hover { color: #C77DFF; }
        .gv-add {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #C77DFF, #E040FB);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 19px; line-height: 1; text-decoration: none;
          flex-shrink: 0; font-weight: 300; transition: opacity 0.2s;
          box-shadow: 0 0 12px rgba(199,125,255,0.4);
        }
        .gv-add:hover { opacity: 0.85; }
      `}</style>
    </div>
  )
}
