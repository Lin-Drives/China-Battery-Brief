import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * home.md S2 background — ~600 tiny volt/teal/signal dots drifting slowly
 * along arc paths from eastern China to landing cities. Additive blending.
 * Lazily loaded; CSS/static fallback handled by the parent.
 */

const START = new THREE.Vector3(5.2, 0.6, 0) // eastern China
const DESTINATIONS = [
  new THREE.Vector3(0.4, 1.6, 0), // Hungary
  new THREE.Vector3(-0.5, 1.9, 0), // Germany
  new THREE.Vector3(-2.8, -1.8, 0), // Brazil
  new THREE.Vector3(5.0, -1.9, 0), // Indonesia
  new THREE.Vector3(-1.2, 0.9, 0), // Morocco
  new THREE.Vector3(-4.6, 1.3, 0), // US Midwest
]
const PALETTE = ['#C9F24B', '#C9F24B', '#5ADFC3', '#FF5B45'].map((c) => new THREE.Color(c))

function Particles({ count = 600 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)

  const sim = useMemo(() => {
    const curves: THREE.QuadraticBezierCurve3[] = []
    const speeds = new Float32Array(count)
    const phases = new Float32Array(count)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const dest = DESTINATIONS[i % DESTINATIONS.length]
      const mid = START.clone().lerp(dest, 0.5)
      mid.y += 0.6 + Math.random() * 1.4
      mid.z += 0.8 + Math.random() * 1.6
      curves.push(new THREE.QuadraticBezierCurve3(START.clone(), mid, dest))
      speeds[i] = 0.015 + Math.random() * 0.045
      phases[i] = Math.random()
      const color = PALETTE[i % PALETTE.length]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    return { curves, speeds, phases, positions, colors }
  }, [count])

  const scratch = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const points = pointsRef.current
    if (!points) return
    const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < count; i++) {
      sim.phases[i] = (sim.phases[i] + sim.speeds[i] * dt) % 1
      sim.curves[i].getPoint(sim.phases[i], scratch)
      attr.setXYZ(i, scratch.x, scratch.y, scratch.z)
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sim.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[sim.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        vertexColors
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

export default function HeroCanvas() {
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      camera={{ position: [0, 0, 10], fov: 50 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
    >
      <Particles />
    </Canvas>
  )
}
