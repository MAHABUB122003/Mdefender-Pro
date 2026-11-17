import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * HeroDashboard3D
 * 
 * Clean, seamless, high-impact 3D Cyber Defense Visual for MDefender Pro Hero Section.
 * Features:
 * - Seamless background integration with the warm cream (#F7F6F1) palette
 * - Perfectly aligned 60 FPS Canvas 3D rotating globe over the central sphere section
 * - Interactive pointer drag rotation with momentum physics
 * - 3D Great-circle laser arcs, traveling photon packets, and radar pulses
 * - Ultra-lightweight direct DOM 3D mouse perspective tilt (0ms overhead, zero React re-renders)
 * - Zero artificial button/badge clutter (no Explore Dashboard, no fake counters)
 */
export default function HeroDashboard3D() {
  const [imgLoaded, setImgLoaded] = useState(false);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const rafTiltId = useRef(null);

  // 3D Sphere Interactive Rotation State
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const velocityY = useRef(0.0052); // Continuous pleasant auto-spin
  const velocityX = useRef(0);
  const rotationY = useRef(0.85); // Initial longitude showing active global arcs
  const rotationX = useRef(0.24); // Spherical axial tilt
  const animFrameId = useRef(null);

  // Real Global Anycast Scrubbing Centers with lat/long in radians + precomputed trigonometric constants
  const popNodes = useMemo(() => {
    const rawNodes = [
      { id: 'lhr', name: 'London', latDeg: 51.50, lonDeg: -0.12 },
      { id: 'fra', name: 'Frankfurt', latDeg: 50.11, lonDeg: 8.68 },
      { id: 'jfk', name: 'New York', latDeg: 40.71, lonDeg: -74.00 },
      { id: 'sfo', name: 'San Francisco', latDeg: 37.77, lonDeg: -122.41 },
      { id: 'dxb', name: 'Dubai', latDeg: 25.20, lonDeg: 55.27 },
      { id: 'sin', name: 'Singapore', latDeg: 1.35, lonDeg: 103.81 },
      { id: 'tyo', name: 'Tokyo', latDeg: 35.67, lonDeg: 139.65 },
      { id: 'syd', name: 'Sydney', latDeg: -33.86, lonDeg: 151.20 },
      { id: 'gru', name: 'São Paulo', latDeg: -23.55, lonDeg: -46.63 },
      { id: 'cpt', name: 'Cape Town', latDeg: -33.92, lonDeg: 18.42 }
    ];
    return rawNodes.map((n) => {
      const lat = (n.latDeg * Math.PI) / 180;
      const lon = (n.lonDeg * Math.PI) / 180;
      return {
        id: n.id,
        name: n.name,
        lat,
        lon,
        sinLat: Math.sin(lat),
        cosLat: Math.cos(lat),
      };
    });
  }, []);

  // Pre-computed continental surface coordinates for glowing 3D cyber grid with precalculated trigonometric values
  const globePoints = useMemo(() => {
    const points = [];
    const regions = [
      { minLat: 16, maxLat: 66, minLon: -140, maxLon: -58, density: 44 }, // North America
      { minLat: -52, maxLat: 12, minLon: -78, maxLon: -36, density: 32 },  // South America
      { minLat: 36, maxLat: 67, minLon: -9, maxLon: 42, density: 40 },     // Europe
      { minLat: -34, maxLat: 36, minLon: -16, maxLon: 48, density: 42 },   // Africa
      { minLat: 8, maxLat: 70, minLon: 45, maxLon: 140, density: 72 },     // Asia
      { minLat: -38, maxLat: -14, minLon: 114, maxLon: 152, density: 24 }  // Australia
    ];

    let seed = 4217;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    regions.forEach((reg) => {
      for (let i = 0; i < reg.density; i++) {
        const lat = (reg.minLat + pseudoRandom() * (reg.maxLat - reg.minLat)) * (Math.PI / 180);
        const lon = (reg.minLon + pseudoRandom() * (reg.maxLon - reg.minLon)) * (Math.PI / 180);
        points.push({
          lat,
          lon,
          sinLat: Math.sin(lat),
          cosLat: Math.cos(lat),
          size: 1.1 + pseudoRandom() * 0.9,
          isOrange: pseudoRandom() > 0.65 // Highlight key defense nodes in amber orange
        });
      }
    });
    return points;
  }, []);

  // Direct DOM Mouse move perspective tilt (Zero React re-render overhead)
  const handleMouseMove = (e) => {
    if (!containerRef.current || !stageRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const normalizedX = (x / rect.width) - 0.5;
    const normalizedY = (y / rect.height) - 0.5;

    if (rafTiltId.current) cancelAnimationFrame(rafTiltId.current);
    rafTiltId.current = requestAnimationFrame(() => {
      if (stageRef.current) {
        stageRef.current.style.transform = `rotateX(${-normalizedY * 7}deg) rotateY(${normalizedX * 9}deg) scale(1.012)`;
      }
    });
  };

  const handleMouseEnter = () => {
    if (stageRef.current) {
      stageRef.current.style.transition = 'transform 0.12s ease-out';
    }
  };

  const handleMouseLeave = () => {
    if (rafTiltId.current) cancelAnimationFrame(rafTiltId.current);
    if (stageRef.current) {
      stageRef.current.style.transition = 'transform 0.35s ease-out';
      stageRef.current.style.transform = 'rotateX(2.5deg) rotateY(-3.5deg) scale(1)';
    }
  };

  // 3D Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      width = Math.round(rect.width);
      // Aspect ratio of the image: 1376 / 768 = 1.791666
      height = Math.round(width * (768 / 1376));

      if (width <= 0 || height <= 0) return;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(resize);
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', resize, { passive: true });

    // Active Anycast Scrubbing Arc Pairs
    const arcPairs = [
      [0, 1], // London <-> Frankfurt
      [1, 2], // Frankfurt <-> New York
      [2, 3], // New York <-> San Francisco
      [3, 6], // San Francisco <-> Tokyo
      [1, 4], // Frankfurt <-> Dubai
      [4, 5], // Dubai <-> Singapore
      [5, 6], // Singapore <-> Tokyo
      [2, 8], // New York <-> São Paulo
      [1, 9]  // Frankfurt <-> Cape Town
    ];

    let lastTime = performance.now();

    const render = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Smooth Inertia & Continuous 3D Auto-Rotation
      if (!isDragging.current) {
        velocityY.current += (0.0042 - velocityY.current) * 0.04;
        velocityX.current += (0 - velocityX.current) * 0.05;
        rotationY.current += velocityY.current;
        rotationX.current += velocityX.current;

        // Clamp vertical tilt
        if (rotationX.current > 0.52) rotationX.current = 0.52;
        if (rotationX.current < -0.32) rotationX.current = -0.32;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Calibrated Sphere Center & Radius (Dead-on mathematical match to the globe)
      const cx = width * 0.5000;
      const cy = height * 0.5273;
      const R = width * 0.1490; // Exactly matches 205px at 1376x768 resolution

      const rotY = rotationY.current;
      const rotX = rotationX.current;
      const cosRotX = Math.cos(rotX);
      const sinRotX = Math.sin(rotX);

      // -----------------------------------------------------------------
      // 1. DYNAMIC ROTATING WIREFRAME MERIDIANS & PARALLELS
      // -----------------------------------------------------------------
      // Longitude Meridians rotating in 3D
      const meridians = [0, 30, 60, 90, 120, 150];
      meridians.forEach((deg) => {
        const rad = (deg * Math.PI) / 180 + rotY;
        const cosRad = Math.cos(rad);
        const semiMinor = Math.abs(R * cosRad);

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.lineWidth = 0.85;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, semiMinor), R, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Latitude Parallels
      const latitudes = [-50, -25, 0, 25, 50];
      latitudes.forEach((latDeg) => {
        const latRad = (latDeg * Math.PI) / 180;
        const ringY = -R * Math.sin(latRad) * cosRotX;
        const ringRadius = R * Math.cos(latRad);
        const ringH = ringRadius * sinRotX;

        ctx.strokeStyle = latDeg === 0 ? 'rgba(232, 121, 47, 0.45)' : 'rgba(40, 116, 93, 0.24)';
        ctx.lineWidth = latDeg === 0 ? 1.4 : 0.8;
        if (latDeg !== 0) ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.ellipse(cx, cy + ringY, Math.max(1, ringRadius), Math.max(1, Math.abs(ringH) + 0.8), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // -----------------------------------------------------------------
      // 2. 3D ROTATING CONTINENTAL CYBER DOTS (LAND COORDINATES)
      // -----------------------------------------------------------------
      for (let i = 0; i < globePoints.length; i++) {
        const pt = globePoints[i];
        const sinLonRot = Math.sin(pt.lon + rotY);
        const cosLonRot = Math.cos(pt.lon + rotY);
        const x3d = R * pt.cosLat * sinLonRot;
        const y1 = R * pt.sinLat;
        const z1 = R * pt.cosLat * cosLonRot;

        const y3d = y1 * cosRotX - z1 * sinRotX;
        const z3d = y1 * sinRotX + z1 * cosRotX;

        // Render front-facing dots with 3D depth attenuation
        if (z3d > -12) {
          const depth = (z3d + R) / (2 * R); // 0 (far) to 1 (near)
          const px = cx + x3d;
          const py = cy - y3d;

          const alpha = Math.max(0.15, Math.min(0.92, depth * 1.05));
          ctx.fillStyle = pt.isOrange
            ? `rgba(232, 121, 47, ${alpha})`
            : `rgba(16, 185, 129, ${alpha * 0.85})`;

          ctx.beginPath();
          ctx.arc(px, py, pt.size * (0.8 + depth * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // -----------------------------------------------------------------
      // 3. 3D GREAT-CIRCLE CYBER DEFENSE ARCS & TRAVELING PHOTONS
      // -----------------------------------------------------------------
      const timeMs = currentTime;

      arcPairs.forEach(([idxA, idxB], arcIndex) => {
        const a = popNodes[idxA];
        const b = popNodes[idxB];

        const sinLonA = Math.sin(a.lon + rotY);
        const cosLonA = Math.cos(a.lon + rotY);
        const xA = R * a.cosLat * sinLonA;
        const y1A = R * a.sinLat;
        const z1A = R * a.cosLat * cosLonA;
        const yA = y1A * cosRotX - z1A * sinRotX;
        const zA = y1A * sinRotX + z1A * cosRotX;

        const sinLonB = Math.sin(b.lon + rotY);
        const cosLonB = Math.cos(b.lon + rotY);
        const xB = R * b.cosLat * sinLonB;
        const y1B = R * b.sinLat;
        const z1B = R * b.cosLat * cosLonB;
        const yB = y1B * cosRotX - z1B * sinRotX;
        const zB = y1B * sinRotX + z1B * cosRotX;

        if (zA > -18 || zB > -18) {
          const pAx = cx + xA;
          const pAy = cy - yA;
          const pBx = cx + xB;
          const pBy = cy - yB;

          // Elevated 3D Midpoint for graceful cyber laser arc
          const dist = Math.hypot(pBx - pAx, pBy - pAy);
          const arcLift = Math.min(42, Math.max(14, dist * 0.24));
          const midX = (pAx + pBx) / 2;
          const midY = (pAy + pBy) / 2 - arcLift;

          // Arc laser stream
          ctx.strokeStyle = arcIndex % 2 === 0
            ? 'rgba(232, 121, 47, 0.55)'
            : 'rgba(16, 185, 129, 0.48)';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(pAx, pAy);
          ctx.quadraticCurveTo(midX, midY, pBx, pBy);
          ctx.stroke();

          // Traveling high-speed photon packet
          const packetPhase = ((timeMs + arcIndex * 420) % 2200) / 2200;
          const t = packetPhase;
          const pktX = (1 - t) * (1 - t) * pAx + 2 * (1 - t) * t * midX + t * t * pBx;
          const pktY = (1 - t) * (1 - t) * pAy + 2 * (1 - t) * t * midY + t * t * pBy;

          // Glow burst
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = arcIndex % 2 === 0 ? '#E8792F' : '#10B981';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(pktX, pktY, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // -----------------------------------------------------------------
      // 4. ANYCAST POP NODES & EXPANDING RADAR SCAN RINGS
      // -----------------------------------------------------------------
      popNodes.forEach((pop) => {
        const sinLon = Math.sin(pop.lon + rotY);
        const cosLon = Math.cos(pop.lon + rotY);
        const x = R * pop.cosLat * sinLon;
        const y1 = R * pop.sinLat;
        const z1 = R * pop.cosLat * cosLon;

        const y = y1 * cosRotX - z1 * sinRotX;
        const z = y1 * sinRotX + z1 * cosRotX;

        if (z > -6) {
          const depthAlpha = Math.max(0, Math.min(1, (z + 6) / (R * 0.45)));
          const px = cx + x;
          const py = cy - y;

          // Expanding radar pulse
          if (z > 6) {
            const pulse = (timeMs % 2000) / 2000;
            ctx.strokeStyle = `rgba(232, 121, 47, ${Math.max(0, (1 - pulse) * 0.72 * depthAlpha)})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.arc(px, py, 3 + pulse * 12, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Node core
          ctx.fillStyle = `rgba(232, 121, 47, ${depthAlpha})`;
          ctx.shadowColor = '#E8792F';
          ctx.shadowBlur = 6 * depthAlpha;
          ctx.beginPath();
          ctx.arc(px, py, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // White center point
          ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // -----------------------------------------------------------------
      // 5. 3D ORBITAL DEFENSE RING ROTATION
      // -----------------------------------------------------------------
      const orbitAngle = rotY * 1.4;
      const orbitR = R * 1.14;
      ctx.strokeStyle = 'rgba(232, 121, 47, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, orbitR, orbitR * 0.38, -0.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Orbiting Defense Satellites / Nodes
      for (let s = 0; s < 3; s++) {
        const satAngle = orbitAngle + (s * Math.PI * 2) / 3;
        const satX = cx + Math.cos(satAngle) * orbitR * Math.cos(-0.32) - Math.sin(satAngle) * (orbitR * 0.38) * Math.sin(-0.32);
        const satY = cy + Math.cos(satAngle) * orbitR * Math.sin(-0.32) + Math.sin(satAngle) * (orbitR * 0.38) * Math.cos(-0.32);

        // Satellite beacon
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#E8792F';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(satX, satY, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', resize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [globePoints, popNodes]);

  // Pointer Dragging for the 3D Sphere
  const handlePointerDown = (e) => {
    isDragging.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;
    velocityY.current = 0;
    velocityX.current = 0;
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouseX.current;
    const dy = e.clientY - lastMouseY.current;

    rotationY.current += dx * 0.0075;
    rotationX.current -= dy * 0.0065;

    velocityY.current = dx * 0.0045;
    velocityX.current = -dy * 0.0035;

    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        perspective: '1400px',
        cursor: 'default',
        padding: '0',
        background: 'transparent',
      }}
    >
      <style>{`
        .hero-visual-stage {
          transform-style: preserve-3d;
          will-change: transform;
        }
      `}</style>

      {/* Main Visual Stage with 3D Mouse Perspective Tilt */}
      <div
        ref={stageRef}
        className="hero-visual-stage"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1376 / 768',
          transform: 'rotateX(2.5deg) rotateY(-3.5deg) scale(1)',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(232, 121, 47, 0.05) 0%, rgba(16, 185, 129, 0.03) 40%, rgba(247, 246, 241, 0.4) 100%)',
          borderRadius: '12px',
          lineHeight: 0,
          userSelect: 'none',
        }}
      >
        {/* Ambient Subtle Cyber Placeholder while image decodes */}
        {!imgLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              border: '1px solid rgba(232, 121, 47, 0.12)',
              background: 'radial-gradient(circle at 50% 53%, rgba(232, 121, 47, 0.08) 0%, rgba(16, 185, 129, 0.04) 35%, #F7F6F1 80%)',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 
          Base High-Resolution Image:
          Preloaded & ultra-optimized WebP with instant aspect-ratio reservation
        */}
        <picture>
          <source srcSet="/assets/hero_cyber_defense_cream.webp" type="image/webp" />
          <img
            ref={(el) => {
              imageRef.current = el;
              if (el && el.complete && !imgLoaded) {
                setImgLoaded(true);
              }
            }}
            src="/assets/hero_cyber_defense_cream.jpg"
            alt="MDefender Pro Global Cyber Defense Intelligence Mesh"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1376}
            height={768}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '1376 / 768',
              display: 'block',
              objectFit: 'contain',
              pointerEvents: 'none',
              transform: 'translateZ(0)',
              borderRadius: '12px',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.28s ease-out',
            }}
          />
        </picture>

        {/* 
          Interactive 3D Layer:
          Canvas sits directly over the image, animating the ball/sphere in real-time 3D
        */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: isDragging.current ? 'grabbing' : 'grab',
            touchAction: 'none',
            zIndex: 2,
          }}
          title="Drag to rotate 3D cyber defense globe"
        />
      </div>
    </div>
  );
}
