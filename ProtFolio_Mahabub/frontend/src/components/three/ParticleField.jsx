import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════
   MINIMALIST EXECUTIVE 3D AMBIENCE — Clean, Subtle & Professional
   Designed for Maximum Content Readability & High-End Tech Aesthetic
   (Inspired by Linear, Vercel, Apple developer portals)
   ═══════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   1. Ultra-Subtle Camera Rig — Micro parallax without distraction
   ───────────────────────────────────────────────────────────── */
function SubtleCameraRig({ isMobile }) {
    const { camera, pointer } = useThree();
    const vec = useMemo(() => new THREE.Vector3(), []);

    useFrame(() => {
        if (isMobile) return;
        // Very gentle micro-movement (subtle 3D depth, zero disturbance)
        camera.position.lerp(
            vec.set(pointer.x * 0.4, pointer.y * 0.3, 16),
            0.02
        );
        camera.lookAt(0, 0, 0);
    });

    return null;
}

/* ─────────────────────────────────────────────────────────────
   2. Calm Connected Network Nodes — Subtle, soft tech constellation
   ───────────────────────────────────────────────────────────── */
function MinimalNetwork({ darkMode, count = 28 }) {
    const linesRef = useRef();
    const pointsRef = useRef();

    const { nodes, nodeColors } = useMemo(() => {
        const nodes = [];
        const nodeColors = new Float32Array(count * 3);
        const color1 = new THREE.Color(darkMode ? '#38bdf8' : '#0284c7');
        const color2 = new THREE.Color(darkMode ? '#818cf8' : '#4f46e5');
        const color3 = new THREE.Color(darkMode ? '#94a3b8' : '#64748b');
        const palette = [color1, color2, color3];

        for (let i = 0; i < count; i++) {
            nodes.push({
                x: (Math.random() - 0.5) * 34,
                y: (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 12 - 4,
                vx: (Math.random() - 0.5) * 0.002, // very slow, calm drift
                vy: (Math.random() - 0.5) * 0.002,
                vz: (Math.random() - 0.5) * 0.001,
            });
            const c = palette[i % palette.length];
            nodeColors[i * 3] = c.r;
            nodeColors[i * 3 + 1] = c.g;
            nodeColors[i * 3 + 2] = c.b;
        }
        return { nodes, nodeColors };
    }, [count, darkMode]);

    const maxLines = (count * (count - 1)) / 2;
    const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
    const lineColors = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
    const nodePositions = useMemo(() => new Float32Array(count * 3), [count]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Gentle, calm drift
        for (let i = 0; i < count; i++) {
            const n = nodes[i];
            n.x += n.vx + Math.sin(t * 0.08 + i) * 0.001;
            n.y += n.vy + Math.cos(t * 0.06 + i) * 0.001;
            n.z += n.vz;

            if (Math.abs(n.x) > 18) n.vx *= -1;
            if (Math.abs(n.y) > 11) n.vy *= -1;
            if (n.z > 0 || n.z < -16) n.vz *= -1;

            nodePositions[i * 3] = n.x;
            nodePositions[i * 3 + 1] = n.y;
            nodePositions[i * 3 + 2] = n.z;
        }

        if (pointsRef.current) {
            pointsRef.current.geometry.attributes.position.needsUpdate = true;
        }

        let lineIdx = 0;
        const maxDist = 6.5;

        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dz = nodes[i].z - nodes[j].z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < maxDist) {
                    const lPosIdx = lineIdx * 6;
                    linePositions[lPosIdx] = nodes[i].x;
                    linePositions[lPosIdx + 1] = nodes[i].y;
                    linePositions[lPosIdx + 2] = nodes[i].z;
                    linePositions[lPosIdx + 3] = nodes[j].x;
                    linePositions[lPosIdx + 4] = nodes[j].y;
                    linePositions[lPosIdx + 5] = nodes[j].z;

                    // Elegant soft fade based on distance
                    const alpha = Math.max(0, 1 - dist / maxDist) * (darkMode ? 0.22 : 0.12);
                    lineColors[lPosIdx] = 0.22 * alpha;
                    lineColors[lPosIdx + 1] = 0.74 * alpha;
                    lineColors[lPosIdx + 2] = 0.97 * alpha;

                    lineColors[lPosIdx + 3] = 0.51 * alpha;
                    lineColors[lPosIdx + 4] = 0.55 * alpha;
                    lineColors[lPosIdx + 5] = 0.97 * alpha;

                    lineIdx++;
                }
            }
        }

        if (linesRef.current) {
            linesRef.current.geometry.setDrawRange(0, lineIdx * 2);
            linesRef.current.geometry.attributes.position.needsUpdate = true;
            linesRef.current.geometry.attributes.color.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Subtle Nodes */}
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[nodePositions, 3]}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        args={[nodeColors, 3]}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={darkMode ? 0.15 : 0.12}
                    vertexColors
                    transparent
                    opacity={darkMode ? 0.55 : 0.3}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Subtle Connection Lines */}
            <lineSegments ref={linesRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[linePositions, 3]}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        args={[lineColors, 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    vertexColors
                    transparent
                    opacity={darkMode ? 0.35 : 0.2}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </lineSegments>
        </group>
    );
}

/* ─────────────────────────────────────────────────────────────
   3. Floating Ambient Dust — Soft, deep background micro-particles
   ───────────────────────────────────────────────────────────── */
function AmbientMicroDust({ darkMode, count = 350 }) {
    const pointsRef = useRef();

    const { positions, colors } = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const palette = [
            new THREE.Color(darkMode ? '#38bdf8' : '#0284c7'),
            new THREE.Color(darkMode ? '#818cf8' : '#4f46e5'),
            new THREE.Color(darkMode ? '#cbd5e1' : '#64748b'),
            new THREE.Color(darkMode ? '#64748b' : '#94a3b8'),
        ];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 44;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 25 - 6;

            const c = palette[i % palette.length];
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        return { positions, colors };
    }, [count, darkMode]);

    useFrame((state) => {
        if (!pointsRef.current) return;
        const t = state.clock.elapsedTime * 0.02;
        pointsRef.current.rotation.y = t * 0.1;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={darkMode ? 0.05 : 0.04}
                vertexColors
                transparent
                opacity={darkMode ? 0.45 : 0.25}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
}

/* ─────────────────────────────────────────────────────────────
   Scene Composition
   ───────────────────────────────────────────────────────────── */
function Scene({ darkMode, isMobile }) {
    return (
        <>
            {/* Soft Ambient Cinematic Lights */}
            <ambientLight intensity={0.2} />
            <pointLight position={[12, 10, 8]} intensity={0.25} color="#38bdf8" distance={50} />
            <pointLight position={[-12, -8, 6]} intensity={0.2} color="#818cf8" distance={50} />

            {/* Subtle, non-distracting camera parallax */}
            <SubtleCameraRig isMobile={isMobile} />

            {/* Soft, calm constellation network in background */}
            <MinimalNetwork darkMode={darkMode} count={isMobile ? 16 : 28} />

            {/* Delicate ambient micro dust for organic depth */}
            <AmbientMicroDust darkMode={darkMode} count={isMobile ? 150 : 350} />
        </>
    );
}

/* ─────────────────────────────────────────────────────────────
   Error Boundary
   ───────────────────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

/* ─────────────────────────────────────────────────────────────
   Main Export
   ───────────────────────────────────────────────────────────── */
export default function ParticleField({ darkMode = true }) {
    const [webglSupported, setWebglSupported] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) setWebglSupported(false);
        } catch {
            setWebglSupported(false);
        }

        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mq.matches);
        const handler = (e) => setReducedMotion(e.matches);
        mq.addEventListener('change', handler);
        setIsMobile(window.innerWidth < 768);
        const resizeHandler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', resizeHandler);

        return () => {
            mq.removeEventListener('change', handler);
            window.removeEventListener('resize', resizeHandler);
        };
    }, []);

    if (!webglSupported || reducedMotion) return null;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ pointerEvents: 'none' }}>
            <ErrorBoundary>
                <Canvas
                    camera={{ position: [0, 0, 16], fov: 50 }}
                    dpr={isMobile ? [1, 1] : [1, 1.5]}
                    gl={{
                        antialias: !isMobile,
                        alpha: true,
                        powerPreference: 'high-performance',
                    }}
                    style={{ background: 'transparent', pointerEvents: 'none' }}
                    onCreated={({ gl }) => {
                        gl.setClearColor(0x000000, 0);
                    }}
                    eventSource={typeof document !== 'undefined' ? document.documentElement : undefined}
                    eventPrefix="client"
                >
                    <Scene darkMode={darkMode} isMobile={isMobile} />
                </Canvas>
            </ErrorBoundary>
        </div>
    );
}
