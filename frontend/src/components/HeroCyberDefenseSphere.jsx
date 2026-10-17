import React, { useRef, useEffect, useState, useMemo } from 'react';

/**
 * HeroCyberDefenseSphere
 * 
 * An interactive, lightweight 60 FPS Canvas 3D rotating globe + world map display
 * specifically tailored for the MDefender Pro Hero section.
 * Matches the warm cream palette (#F7F5EE / #F7F6F1) with golden amber (#E8792F)
 * and deep pine green (#0B2522) accents.
 */
export default function HeroCyberDefenseSphere() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Interaction & Rotation Refs
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const velocityY = useRef(0.0042);
  const velocityX = useRef(0);
  const rotationY = useRef(0.65); // initial pleasant angle showing Atlantic / Europe / Americas
  const rotationX = useRef(0.22); // subtle tilt for realistic 3D perspective
  const animFrameId = useRef(null);

  const [activePoP, setActivePoP] = useState(null);
  const [mitigatedCount, setMitigatedCount] = useState(6501208);
  const [isHovered, setIsHovered] = useState(false);

  // Real Global Anycast Scrubbing Centers with lat/long in radians
  const popNodes = useMemo(() => [
    { id: 'lhr', name: 'London', code: 'LHR-01', lat: (51.50 * Math.PI) / 180, lon: (-0.12 * Math.PI) / 180, ping: '0.07ms', region: 'Europe' },
    { id: 'fra', name: 'Frankfurt', code: 'FRA-04', lat: (50.11 * Math.PI) / 180, lon: (8.68 * Math.PI) / 180, ping: '0.08ms', region: 'Europe' },
    { id: 'jfk', name: 'New York', code: 'JFK-02', lat: (40.71 * Math.PI) / 180, lon: (-74.00 * Math.PI) / 180, ping: '0.11ms', region: 'North America' },
    { id: 'sfo', name: 'San Francisco', code: 'SFO-01', lat: (37.77 * Math.PI) / 180, lon: (-122.41 * Math.PI) / 180, ping: '0.10ms', region: 'North America' },
    { id: 'dxb', name: 'Dubai', code: 'DXB-01', lat: (25.20 * Math.PI) / 180, lon: (55.27 * Math.PI) / 180, ping: '0.09ms', region: 'Middle East' },
    { id: 'sin', name: 'Singapore', code: 'SIN-08', lat: (1.35 * Math.PI) / 180, lon: (103.81 * Math.PI) / 180, ping: '0.12ms', region: 'Asia-Pacific' },
    { id: 'tyo', name: 'Tokyo', code: 'NRT-03', lat: (35.67 * Math.PI) / 180, lon: (139.65 * Math.PI) / 180, ping: '0.14ms', region: 'Asia-Pacific' },
    { id: 'syd', name: 'Sydney', code: 'SYD-01', lat: (-33.86 * Math.PI) / 180, lon: (151.20 * Math.PI) / 180, ping: '0.16ms', region: 'Asia-Pacific' },
    { id: 'gru', name: 'São Paulo', code: 'GRU-01', lat: (-23.55 * Math.PI) / 180, lon: (-46.63 * Math.PI) / 180, ping: '0.15ms', region: 'South America' },
    { id: 'cpt', name: 'Cape Town', code: 'CPT-01', lat: (-33.92 * Math.PI) / 180, lon: (18.42 * Math.PI) / 180, ping: '0.18ms', region: 'Africa' }
  ], []);

  // Pre-generate continent surface dots (deterministic pseudo-random distribution)
  const globePoints = useMemo(() => {
    const points = [];
    const regions = [
      { minLat: 16, maxLat: 66, minLon: -140, maxLon: -58, density: 46 }, // North America
      { minLat: -52, maxLat: 12, minLon: -78, maxLon: -36, density: 34 },  // South America
      { minLat: 36, maxLat: 67, minLon: -9, maxLon: 42, density: 42 },     // Europe
      { minLat: -34, maxLat: 36, minLon: -16, maxLon: 48, density: 44 },   // Africa
      { minLat: 8, maxLat: 70, minLon: 45, maxLon: 140, density: 78 },     // Asia
      { minLat: -38, maxLat: -14, minLon: 114, maxLon: 152, density: 26 }  // Australia
    ];

    let seed = 1337;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    regions.forEach((reg) => {
      for (let i = 0; i < reg.density; i++) {
        const lat = reg.minLat + pseudoRandom() * (reg.maxLat - reg.minLat);
        const lon = reg.minLon + pseudoRandom() * (reg.maxLon - reg.minLon);
        points.push({
          lat: (lat * Math.PI) / 180,
          lon: (lon * Math.PI) / 180,
          size: 1.1 + pseudoRandom() * 0.8
        });
      }
    });
    return points;
  }, []);

  // Soft live increment of threat counter to feel live
  useEffect(() => {
    const timer = setInterval(() => {
      setMitigatedCount(prev => prev + Math.floor(Math.random() * 4) + 1);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // 3D Canvas Projection & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      width = rect.width;
      // Expansive aspect ratio matching the high-res world map
      height = Math.round(width * 0.65);
      if (height < 360) height = 360;
      if (height > 620) height = 620;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    // Active Great-Circle Cyber Defense Interception Beams
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

      // Inertia & Continuous Smooth Auto-Rotation
      if (!isDragging.current) {
        // Gently return to target velocity
        velocityY.current += (0.0036 - velocityY.current) * 0.04;
        velocityX.current += (0 - velocityX.current) * 0.05;
        rotationY.current += velocityY.current;
        rotationX.current += velocityX.current;

        // Clamp vertical tilt to avoid tumbling
        if (rotationX.current > 0.55) rotationX.current = 0.55;
        if (rotationX.current < -0.35) rotationX.current = -0.35;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Sphere positioning: perfectly centered over the Africa/Europe meridian
      const cx = width * 0.505;
      const cy = height * 0.495;
      // Prominent, expansive 3D radius
      const R = Math.min(width, height) * 0.49;

      const rotY = rotationY.current;
      const rotX = rotationX.current;

      // -------------------------------------------------------------
      // 1. ATMOSPHERIC AURA & RADIAL GLOW (Amber & Golden Warmth)
      // -------------------------------------------------------------
      const auraGrad = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R * 1.36);
      auraGrad.addColorStop(0, 'rgba(232, 121, 47, 0.20)');
      auraGrad.addColorStop(0.4, 'rgba(217, 130, 43, 0.11)');
      auraGrad.addColorStop(0.75, 'rgba(40, 116, 93, 0.05)');
      auraGrad.addColorStop(1, 'rgba(247, 245, 238, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.36, 0, Math.PI * 2);
      ctx.fill();

      // -------------------------------------------------------------
      // 2. 3D TRANSLUCENT GLASS SPHERE BODY
      // -------------------------------------------------------------
      // Realistic spherical lighting gradient (specular highlight on top-left)
      const sphereGrad = ctx.createRadialGradient(
        cx - R * 0.35,
        cy - R * 0.35,
        R * 0.06,
        cx,
        cy,
        R
      );
      sphereGrad.addColorStop(0, 'rgba(255, 252, 245, 0.58)');
      sphereGrad.addColorStop(0.35, 'rgba(242, 230, 208, 0.28)');
      sphereGrad.addColorStop(0.75, 'rgba(224, 198, 162, 0.16)');
      sphereGrad.addColorStop(1, 'rgba(180, 115, 55, 0.32)');

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Outer Fine Glowing Golden Rim
      ctx.strokeStyle = 'rgba(232, 121, 47, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // Delicate Inner Fresnel Glow Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 1.5, 0, Math.PI * 2);
      ctx.stroke();

      // Orbital Cyber Shield Perimeter Ring
      ctx.strokeStyle = 'rgba(232, 121, 47, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // -------------------------------------------------------------
      // 3. 3D ROTATING LATITUDE & LONGITUDE WIREFRAME RINGS
      // -------------------------------------------------------------
      // Parallels (Latitudes)
      const latitudes = [-55, -30, 0, 30, 55];
      latitudes.forEach((latDeg) => {
        const latRad = (latDeg * Math.PI) / 180;
        const ringY = -R * Math.sin(latRad) * Math.cos(rotX);
        const ringRadius = R * Math.cos(latRad);
        const ringH = ringRadius * Math.sin(rotX);

        ctx.strokeStyle = latDeg === 0 ? 'rgba(232, 121, 47, 0.42)' : 'rgba(180, 140, 95, 0.22)';
        ctx.lineWidth = latDeg === 0 ? 1.2 : 0.8;
        if (latDeg !== 0) ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.ellipse(cx, cy + ringY, ringRadius, Math.abs(ringH) + 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Meridians (Longitudes) rotating in 3D perspective
      const meridianAngles = [0, 45, 90, 135];
      meridianAngles.forEach((deg) => {
        const rad = (deg * Math.PI) / 180 + rotY;
        const cosRad = Math.cos(rad);

        ctx.strokeStyle = 'rgba(180, 140, 95, 0.18)';
        ctx.lineWidth = 0.75;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        const semiMinor = Math.abs(R * cosRad);
        ctx.ellipse(cx, cy, semiMinor, R, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // -------------------------------------------------------------
      // 4. ROTATING CONTINENTAL DOTS ON 3D SURFACE
      // -------------------------------------------------------------
      for (let i = 0; i < globePoints.length; i++) {
        const pt = globePoints[i];
        const x = R * Math.cos(pt.lat) * Math.sin(pt.lon + rotY);
        const y1 = R * Math.sin(pt.lat);
        const z1 = R * Math.cos(pt.lat) * Math.cos(pt.lon + rotY);

        const y = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);

        // Front-facing dots have z > -15
        if (z > -15) {
          const depth = (z + R) / (2 * R); // 0 (far) to 1 (near)
          const px = cx + x;
          const py = cy - y;

          // Warm golden/sand continental points matching the image
          const alpha = Math.max(0.12, Math.min(0.85, depth * 0.95));
          ctx.fillStyle = `rgba(180, 120, 55, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, pt.size * (0.8 + depth * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // -------------------------------------------------------------
      // 5. 3D GREAT-CIRCLE CYBER DEFENSE ARCS & DATA PACKETS
      // -------------------------------------------------------------
      const timeMs = currentTime;

      arcPairs.forEach(([idxA, idxB], arcIndex) => {
        const a = popNodes[idxA];
        const b = popNodes[idxB];

        // 3D coordinates for Point A
        const xA = R * Math.cos(a.lat) * Math.sin(a.lon + rotY);
        const y1A = R * Math.sin(a.lat);
        const z1A = R * Math.cos(a.lat) * Math.cos(a.lon + rotY);
        const yA = y1A * Math.cos(rotX) - z1A * Math.sin(rotX);
        const zA = y1A * Math.sin(rotX) + z1A * Math.cos(rotX);

        // 3D coordinates for Point B
        const xB = R * Math.cos(b.lat) * Math.sin(b.lon + rotY);
        const y1B = R * Math.sin(b.lat);
        const z1B = R * Math.cos(b.lat) * Math.cos(b.lon + rotY);
        const yB = y1B * Math.cos(rotX) - z1B * Math.sin(rotX);
        const zB = y1B * Math.sin(rotX) + z1B * Math.cos(rotX);

        // Render if at least one point is on the front side
        if (zA > -20 || zB > -20) {
          const pAx = cx + xA;
          const pAy = cy - yA;
          const pBx = cx + xB;
          const pBy = cy - yB;

          // Elevated 3D Midpoint for natural arc curve
          const dist = Math.hypot(pBx - pAx, pBy - pAy);
          const arcLift = Math.min(52, Math.max(18, dist * 0.28));
          const midX = (pAx + pBx) / 2;
          const midY = (pAy + pBy) / 2 - arcLift;

          // Arc stream line (Golden Amber with delicate glow)
          ctx.strokeStyle = 'rgba(232, 121, 47, 0.45)';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(pAx, pAy);
          ctx.quadraticCurveTo(midX, midY, pBx, pBy);
          ctx.stroke();

          // Multiple Staggered Traveling Photon Packets
          const packetPhase = ((timeMs + arcIndex * 380) % 2000) / 2000;
          const t = packetPhase;
          const pktX = (1 - t) * (1 - t) * pAx + 2 * (1 - t) * t * midX + t * t * pBx;
          const pktY = (1 - t) * (1 - t) * pAy + 2 * (1 - t) * t * midY + t * t * pBy;

          // Photon glow
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = '#E8792F';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(pktX, pktY, 2.6, 0, Math.PI * 2);
          ctx.fill();

          // Packet trailing flare
          ctx.fillStyle = '#E8792F';
          ctx.beginPath();
          ctx.arc(pktX, pktY, 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // -------------------------------------------------------------
      // 6. GLOBAL ANYCAST SCRUBBING POP NODES & RADAR PULSES
      // -------------------------------------------------------------
      popNodes.forEach((pop) => {
        const x = R * Math.cos(pop.lat) * Math.sin(pop.lon + rotY);
        const y1 = R * Math.sin(pop.lat);
        const z1 = R * Math.cos(pop.lat) * Math.cos(pop.lon + rotY);

        const y = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);

        // Smooth depth fade: fades out gracefully as it turns to back of globe
        if (z > -5) {
          const depthAlpha = Math.max(0, Math.min(1, (z + 5) / (R * 0.45)));
          const px = cx + x;
          const py = cy - y;
          const isSelected = activePoP === pop.id;

          // Expanding radar pulse ring (front facing only)
          if (z > 8) {
            const pulse = (timeMs % 1800) / 1800;
            ctx.strokeStyle = `rgba(232, 121, 47, ${Math.max(0, (1 - pulse) * 0.75 * depthAlpha)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(px, py, 4 + pulse * 14, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Inner solid core node
          ctx.fillStyle = isSelected ? '#10B981' : `rgba(232, 121, 47, ${depthAlpha})`;
          ctx.shadowColor = isSelected ? '#10B981' : '#E8792F';
          ctx.shadowBlur = 8 * depthAlpha;
          ctx.beginPath();
          ctx.arc(px, py, isSelected ? 4.2 : 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // White center point
          ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.4, 0, Math.PI * 2);
          ctx.fill();

          // Node Label Tag (Rendered with high depth clarity when z > 18)
          if (z > 18) {
            ctx.font = '600 10px Inter, system-ui, sans-serif';
            const textWidth = ctx.measureText(pop.name).width;

            // Label pill background
            ctx.fillStyle = `rgba(11, 37, 34, ${0.85 * depthAlpha})`;
            ctx.beginPath();
            ctx.roundRect(px + 8, py - 9, textWidth + 10, 17, 4);
            ctx.fill();

            // Label text
            ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha})`;
            ctx.fillText(pop.name, px + 13, py + 3);
          }
        }
      });

      // -------------------------------------------------------------
      // 7. SPECULAR SPHERE SURFACE SHEEN & AMBIENT RING
      // -------------------------------------------------------------
      // Delicate top-left specular highlight curve
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx - R * 0.18, cy - R * 0.18, R * 0.76, Math.PI * 1.05, Math.PI * 1.45);
      ctx.stroke();

      ctx.restore();
      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [globePoints, popNodes, activePoP]);

  // =========================================================================
  // UNIFIED POINTER DRAGGING (Mouse, Touch, Stylus with PointerCapture)
  // =========================================================================
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

    rotationY.current += dx * 0.007;
    rotationX.current -= dy * 0.006;

    // Record instantaneous velocity for smooth release momentum
    velocityY.current = dx * 0.004;
    velocityX.current = -dy * 0.003;

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
      style={{
        position: 'relative',
        width: '100%',
        background: 'transparent',
        lineHeight: 0,
        userSelect: 'none',
        overflow: 'visible',
        cursor: isDragging.current ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 
        Background Layer: High-resolution World Anycast Map 
        Seamlessly blended directly on the hero background with feathered edges
      */}
      <img
        src="/global_anycast_network.jpg"
        alt="MDefender Pro Global Anycast Map"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
          filter: 'contrast(1.02) saturate(1.04)',
          pointerEvents: 'none',
          WebkitMaskImage: 'radial-gradient(ellipse 96% 92% at 50% 50%, black 72%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 96% 92% at 50% 50%, black 72%, transparent 100%)',
        }}
      />

      {/* 
        Interactive 3D Layer: Rotating Cyber Ball / Sphere Canvas
        Positioned directly over the world map in 3D
      */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none', // events handled on parent
        }}
      />
    </div>
  );
}
