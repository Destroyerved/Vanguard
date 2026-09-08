"use client"

import React, { useEffect, useRef, useCallback } from "react"
import createGlobe from "cobe"

export interface PulseMarker {
  id: string
  location: [number, number]
  delay?: number
}

export interface GlobePulseProps {
  markers?: PulseMarker[]
  className?: string
  speed?: number
  baseColor?: [number, number, number]
  markerColor?: [number, number, number]
  glowColor?: [number, number, number]
  dark?: number
  diffuse?: number
  mapBrightness?: number
  arcColor?: [number, number, number]
  pulseColor?: string
  showOverlayPulses?: boolean
}

const DEFAULT_MARKERS: PulseMarker[] = [
  { id: "pulse-1", location: [51.51, -0.13], delay: 0 },
  { id: "pulse-2", location: [40.71, -74.01], delay: 0.5 },
  { id: "pulse-3", location: [35.68, 139.65], delay: 1 },
  { id: "pulse-4", location: [-33.87, 151.21], delay: 1.5 },
]

export function GlobePulse({
  markers = DEFAULT_MARKERS,
  className = "",
  speed = 0.003,
  baseColor = [0.5, 0.5, 0.5],
  markerColor = [0.2, 0.8, 0.9],
  glowColor = [0.05, 0.05, 0.05],
  dark = 1,
  diffuse = 1.5,
  mapBrightness = 10,
  arcColor = [0.3, 0.85, 0.95],
  pulseColor = "#a4c639",
  showOverlayPulses = false,
}: GlobePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)
  const phiRef = useRef(0)
  const animIdRef = useRef<number>(0)

  // Keep latest configuration in ref to avoid destroying & recreating WebGL context
  const configRef = useRef({
    markers,
    speed,
    baseColor,
    markerColor,
    glowColor,
    dark,
    diffuse,
    mapBrightness,
    arcColor,
  })

  // Update configRef and trigger smooth globe.update when props change
  useEffect(() => {
    configRef.current = {
      markers,
      speed,
      baseColor,
      markerColor,
      glowColor,
      dark,
      diffuse,
      mapBrightness,
      arcColor,
    }

    if (globeRef.current) {
      globeRef.current.update({
        dark,
        diffuse,
        mapBrightness,
        baseColor,
        markerColor,
        glowColor,
        arcColor,
        markers: markers.map((m) => ({ location: m.location, size: 0.035, id: m.id })),
      })
    }
  }, [markers, speed, baseColor, markerColor, glowColor, dark, diffuse, mapBrightness, arcColor])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
    isPausedRef.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        }
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  // Single WebGL initialization on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let currentWidth = 0

    function initGlobe() {
      if (!canvas) return
      const width = canvas.offsetWidth
      if (width === 0 || globeRef.current) return
      currentWidth = width

      const cfg = configRef.current
      globeRef.current = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: width * 2,
        height: width * 2,
        phi: 0,
        theta: 0.2,
        dark: cfg.dark,
        diffuse: cfg.diffuse,
        mapSamples: 16000,
        mapBrightness: cfg.mapBrightness,
        baseColor: cfg.baseColor,
        markerColor: cfg.markerColor,
        glowColor: cfg.glowColor,
        markerElevation: 0,
        markers: cfg.markers.map((m) => ({ location: m.location, size: 0.035, id: m.id })),
        arcs: [],
        arcColor: cfg.arcColor,
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.9,
      })

      function animate() {
        if (!isPausedRef.current) {
          phiRef.current += configRef.current.speed
        }
        if (globeRef.current) {
          globeRef.current.update({
            phi: phiRef.current + phiOffsetRef.current + dragOffset.current.phi,
            theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
          })
        }
        animIdRef.current = requestAnimationFrame(animate)
      }

      animate()
    }

    if (canvas.offsetWidth > 0) {
      initGlobe()
    }

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0 && Math.abs(w - currentWidth) > 30) {
        if (globeRef.current) {
          globeRef.current.destroy()
          globeRef.current = null
        }
        initGlobe()
      }
    })
    ro.observe(canvas)

    return () => {
      ro.disconnect()
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
      if (globeRef.current) {
        globeRef.current.destroy()
        globeRef.current = null
      }
    }
  }, []) // Empty dependency array: NEVER tears down on parent re-renders!

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      {showOverlayPulses && (
        <style>{`
          @keyframes pulse-subtle-glow {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.25); opacity: 0.9; }
          }
        `}</style>
      )}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 1, // Instantly visible with ZERO opacity flicker!
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
      {showOverlayPulses &&
        markers.map((m) => (
          <div
            key={m.id}
            style={{
              position: "absolute",
              positionAnchor: `--cobe-${m.id}`,
              bottom: "anchor(center)",
              left: "anchor(center)",
              translate: "-50% 50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none" as const,
              opacity: `var(--cobe-visible-${m.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 6px))`,
              transition: "opacity 0.3s ease",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                border: `1.5px solid ${pulseColor}`,
                borderRadius: "50%",
                animation: `pulse-subtle-glow 3s ease-in-out infinite ${m.delay || 0}s`,
              }}
            />
            <span
              style={{
                width: 8,
                height: 8,
                background: pulseColor,
                borderRadius: "50%",
                boxShadow: `0 0 8px ${pulseColor}`,
              }}
            />
          </div>
        ))}
    </div>
  )
}
