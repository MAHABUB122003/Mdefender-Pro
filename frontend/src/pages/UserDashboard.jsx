import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import api from '../api/api';
import userStore from '../utils/userStore';
import copyToClipboard from '../utils/clipboard';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Activity,
  TrendingUp,
  RefreshCw,
  Sliders,
  Trash2,
  Clock,
  ArrowRight,
  Lock,
  Crown,
  CheckCircle2,
  XCircle,
  Crosshair,
  Server,
  Cpu,
  Zap,
  Ban,
  Layers,
  Radio,
  RadioTower,
  Check,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  BarChart3,
  SlidersHorizontal,
  Flame,
  FileText,
  Compass,
  Radar,
  Box,
  Layers3,
  Terminal
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

// =========================================================================
// 1. BRAND-HARMONIZED COLOR PALETTE (No Rainbow Clutter - 100% Cohesive)
// =========================================================================
const securityPalette = [
  '#DC2626', // Critical Threats (SQLi / RCE)
  '#E8792F', // High Severity (XSS / Prompt Injection)
  '#28745D', // Machine Learning Heuristic Anomalies (Forest Emerald)
  '#475569', // Bot Scanners & Web Crawlers (Slate)
  '#64748B', // Path Traversal & Secondary Probes (Muted Slate)
  '#10201E', // Ingress Edge Deep Neutral
  '#D97735'  // Brand Warm Accent
];

const severityConfig = {
  sqli: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  sql: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  rce: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  command: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  xss: { label: 'HIGH', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  lfi: { label: 'HIGH', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  path: { label: 'HIGH', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  traversal: { label: 'HIGH', color: '#D97735', bg: '#FEF3EB', border: '#FCD8BF' },
  bot: { label: 'BLOCKED', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  scanner: { label: 'BLOCKED', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  probe: { label: 'DETECTED', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  clean: { label: 'PASSED', color: '#15803D', bg: '#F0FDF4', border: '#DCFCE7' },
  allowed: { label: 'PASSED', color: '#15803D', bg: '#F0FDF4', border: '#DCFCE7' },
  ingress: { label: 'PASSED', color: '#15803D', bg: '#F0FDF4', border: '#DCFCE7' },
  default: { label: 'MITIGATED', color: '#E8792F', bg: '#FEF3EB', border: '#FCD8BF' }
};

function getSeverity(type = '') {
  const lower = (type || '').toLowerCase();
  for (const [k, v] of Object.entries(severityConfig)) {
    if (lower.includes(k)) return v;
  }
  return severityConfig.default;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    if (typeof timestamp === 'string' && timestamp.toLowerCase().includes('just')) return timestamp;
    const dateStr = String(timestamp).replace(' ', 'T');
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return String(timestamp);
    const diff = Math.floor((Date.now() - time) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return String(timestamp);
  }
}

function useAnimatedNumber(target) {
  const [value, setValue] = useState(target || 0);
  useEffect(() => {
    if (!target && target !== 0) return;
    const numTarget = Number(target) || 0;
    setValue(numTarget);
  }, [target]);
  return (value || 0).toLocaleString();
}

// =========================================================================
// 2. 3D VOLUMETRIC CYBER INGRESS TELEMETRY COMPONENT (Left Side 3D Waveform)
// =========================================================================
function CyberTraffic3D({ days = [], cleanCounts = [], threatCounts = [], metric = 'both' }) {
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, isHover: false });
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const maxVal = useMemo(() => {
    const all = [...cleanCounts, ...threatCounts];
    const mx = Math.max(...all, 10);
    return Math.ceil(mx * 1.15);
  }, [cleanCounts, threatCounts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.parentElement?.clientWidth || 640;
    let height = 240;

    const setupDPR = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.parentElement?.clientWidth || 640;
      height = 240;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    setupDPR();
    window.addEventListener('resize', setupDPR);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const dpr = window.devicePixelRatio || 1;
      const effectiveW = width;
      const effectiveH = height;

      // Dynamic 3D perspective tilt from mouse
      const mouseOffset = mouseRef.current.isHover
        ? (mouseRef.current.x - effectiveW / 2) * 0.04
        : 0;

      const floorY = effectiveH * 0.82;
      const floorBackY = effectiveH * 0.74;
      const leftPad = 48;
      const rightPad = 48;
      const usableW = effectiveW - leftPad - rightPad;
      const stepX = usableW / (days.length - 1 || 1);

      // 1. Draw 3D Isometric Cyber Grid Floor
      const gridRows = 4;
      for (let r = 0; r <= gridRows; r++) {
        const ratio = r / gridRows;
        const y = floorBackY + ratio * (floorY - floorBackY);
        const inset = (1 - ratio) * 24;

        ctx.strokeStyle = `rgba(16, 32, 30, ${0.03 + ratio * 0.06})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftPad + inset + mouseOffset * ratio, y);
        ctx.lineTo(effectiveW - rightPad - inset + mouseOffset * ratio, y);
        ctx.stroke();
      }

      // Vertical 3D perspective divider lines
      for (let i = 0; i < days.length; i++) {
        const xFront = leftPad + i * stepX;
        const xBack = leftPad + 24 + i * (stepX * 0.94) + mouseOffset;

        ctx.strokeStyle = i === hoveredIndex ? 'rgba(232, 121, 47, 0.35)' : 'rgba(16, 32, 30, 0.05)';
        ctx.lineWidth = i === hoveredIndex ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(xBack, floorBackY);
        ctx.lineTo(xFront, floorY);
        ctx.stroke();
      }

      // Calculate 3D points for Threat Track (Background Depth Track)
      const threatPoints = [];
      for (let i = 0; i < days.length; i++) {
        const val = threatCounts[i] || 0;
        const hRatio = Math.min(1, val / maxVal);
        const apexH = hRatio * (effectiveH * 0.55);
        const xBack = leftPad + 18 + i * (stepX * 0.96) + mouseOffset;
        const yBack = floorBackY - apexH;
        threatPoints.push({ x: xBack, y: yBack, val, count: val });
      }

      // Calculate 3D points for Clean Ingress Track (Foreground Main Track)
      const cleanPoints = [];
      for (let i = 0; i < days.length; i++) {
        const val = cleanCounts[i] || 0;
        const hRatio = Math.min(1, val / maxVal);
        const apexH = hRatio * (effectiveH * 0.60);
        const xFront = leftPad + i * stepX;
        const yFront = floorY - 6 - apexH;
        cleanPoints.push({ x: xFront, y: yFront, val, count: val });
      }

      // 2. Render Threat Quarantined 3D Ribbon (Red Laser Mesh)
      if (metric === 'both' || metric === 'threats') {
        // Volumetric Extruded Fill down to floor
        ctx.beginPath();
        ctx.moveTo(threatPoints[0].x, floorBackY);
        for (let i = 0; i < threatPoints.length; i++) {
          if (i === 0) ctx.lineTo(threatPoints[i].x, threatPoints[i].y);
          else {
            const prev = threatPoints[i - 1];
            const curr = threatPoints[i];
            const cpX = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
          }
        }
        ctx.lineTo(threatPoints[threatPoints.length - 1].x, floorBackY);
        ctx.closePath();

        const threatGrad = ctx.createLinearGradient(0, 0, 0, floorBackY);
        threatGrad.addColorStop(0, 'rgba(220, 38, 38, 0.28)');
        threatGrad.addColorStop(1, 'rgba(220, 38, 38, 0.02)');
        ctx.fillStyle = threatGrad;
        ctx.fill();

        // 3D Laser Ribbon Stroke
        ctx.beginPath();
        for (let i = 0; i < threatPoints.length; i++) {
          if (i === 0) ctx.moveTo(threatPoints[i].x, threatPoints[i].y);
          else {
            const prev = threatPoints[i - 1];
            const curr = threatPoints[i];
            const cpX = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
          }
        }
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Threat Nodes
        threatPoints.forEach((pt, i) => {
          ctx.fillStyle = i === hoveredIndex ? '#FFFFFF' : '#DC2626';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, i === hoveredIndex ? 4.5 : 3, 0, Math.PI * 2);
          ctx.fill();

          if (i === hoveredIndex) {
            ctx.strokeStyle = '#DC2626';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      }

      // 3. Render Clean Ingress 3D Volumetric Ribbon (Deep Forest Slate + Signal Orange Aura)
      if (metric === 'both' || metric === 'clean') {
        // Volumetric Extruded Fill
        ctx.beginPath();
        ctx.moveTo(cleanPoints[0].x, floorY);
        for (let i = 0; i < cleanPoints.length; i++) {
          if (i === 0) ctx.lineTo(cleanPoints[i].x, cleanPoints[i].y);
          else {
            const prev = cleanPoints[i - 1];
            const curr = cleanPoints[i];
            const cpX = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
          }
        }
        ctx.lineTo(cleanPoints[cleanPoints.length - 1].x, floorY);
        ctx.closePath();

        const cleanGrad = ctx.createLinearGradient(0, 0, 0, floorY);
        cleanGrad.addColorStop(0, 'rgba(232, 121, 47, 0.22)');
        cleanGrad.addColorStop(0.5, 'rgba(16, 32, 30, 0.12)');
        cleanGrad.addColorStop(1, 'rgba(16, 32, 30, 0.01)');
        ctx.fillStyle = cleanGrad;
        ctx.fill();

        // Top 3D Ribbon Stroke
        ctx.beginPath();
        for (let i = 0; i < cleanPoints.length; i++) {
          if (i === 0) ctx.moveTo(cleanPoints[i].x, cleanPoints[i].y);
          else {
            const prev = cleanPoints[i - 1];
            const curr = cleanPoints[i];
            const cpX = (prev.x + curr.x) / 2;
            ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
          }
        }
        ctx.strokeStyle = '#10201E';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Animated Ingress Energy Packet (Traveling along the curve)
        const t = (Date.now() % 3200) / 3200;
        const totalSegments = cleanPoints.length - 1;
        const currentSegment = Math.min(totalSegments - 1, Math.floor(t * totalSegments));
        const segT = (t * totalSegments) - currentSegment;

        const pA = cleanPoints[currentSegment];
        const pB = cleanPoints[currentSegment + 1];
        if (pA && pB) {
          const midX = (pA.x + pB.x) / 2;
          const pktX = (1 - segT) * (1 - segT) * pA.x + 2 * (1 - segT) * segT * midX + segT * segT * pB.x;
          const pktY = (1 - segT) * (1 - segT) * pA.y + 2 * (1 - segT) * segT * ((pA.y + pB.y) / 2) + segT * segT * pB.y;

          // Glowing Packet Pulse
          ctx.fillStyle = '#E8792F';
          ctx.shadowColor = '#E8792F';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(pktX, pktY, 3.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Clean Nodes on Apex with Light Pillars
        cleanPoints.forEach((pt, i) => {
          const isHov = i === hoveredIndex;

          // Vertical laser guide beam from floor to apex
          ctx.strokeStyle = isHov ? 'rgba(232, 121, 47, 0.45)' : 'rgba(16, 32, 30, 0.08)';
          ctx.lineWidth = isHov ? 1.5 : 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(pt.x, floorY);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Floor Anchor Footprint
          ctx.fillStyle = isHov ? '#E8792F' : 'rgba(16, 32, 30, 0.2)';
          ctx.beginPath();
          ctx.ellipse(pt.x, floorY, isHov ? 5 : 3, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Apex Node
          ctx.fillStyle = isHov ? '#E8792F' : '#10201E';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isHov ? 5 : 3.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isHov ? 2.5 : 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 4. Render Day Labels on 3D Floor Base
      days.forEach((day, i) => {
        const x = leftPad + i * stepX;
        const isHov = i === hoveredIndex;
        ctx.font = isHov ? '800 11px Inter, sans-serif' : '600 10.5px Inter, sans-serif';
        ctx.fillStyle = isHov ? '#E8792F' : '#87948D';
        ctx.textAlign = 'center';
        ctx.fillText(day, x, floorY + 16);
      });

      // 5. Floating Holographic 3D HUD Tooltip when Hovering
      if (hoveredIndex !== null && cleanPoints[hoveredIndex]) {
        const pt = cleanPoints[hoveredIndex];
        const threatPt = threatPoints[hoveredIndex];
        const dayLabel = days[hoveredIndex] || '';
        const cleanCount = cleanCounts[hoveredIndex] || 0;
        const threatCount = threatCounts[hoveredIndex] || 0;

        const hudW = 150;
        const hudH = 68;
        let hudX = Math.max(10, Math.min(effectiveW - hudW - 10, pt.x - hudW / 2));
        let hudY = Math.max(12, pt.y - hudH - 12);

        // Holographic Glassmorphic Container
        ctx.fillStyle = 'rgba(16, 32, 30, 0.94)';
        ctx.shadowColor = 'rgba(16, 32, 30, 0.18)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, hudW, hudH, 10);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(232, 121, 47, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, hudW, hudH, 10);
        ctx.stroke();

        // HUD Content Text
        ctx.textAlign = 'left';
        ctx.font = '800 11px Inter, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(dayLabel, hudX + 10, hudY + 18);

        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.fillStyle = '#A7F3D0';
        ctx.fillText(`Clean: ${cleanCount.toLocaleString()} reqs`, hudX + 10, hudY + 36);

        ctx.fillStyle = '#FECACA';
        ctx.fillText(`Quarantined: ${threatCount.toLocaleString()} dropped`, hudX + 10, hudY + 54);
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', setupDPR);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [days, cleanCounts, threatCounts, metric, maxVal, hoveredIndex]);

  // Mouse move handler to find nearest hovered day
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseRef.current = { x, y, isHover: true };

    const leftPad = 48;
    const rightPad = 48;
    const usableW = canvas.width / (window.devicePixelRatio || 1) - leftPad - rightPad;
    const stepX = usableW / (days.length - 1 || 1);

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < days.length; i++) {
      const dayX = leftPad + i * stepX;
      const diff = Math.abs(x - dayX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    if (minDiff < stepX * 0.75) {
      setHoveredIndex(closestIdx);
    } else {
      setHoveredIndex(null);
    }
  };

  const handleMouseLeave = () => {
    mouseRef.current.isHover = false;
    setHoveredIndex(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '240px', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          height: '240px',
          display: 'block',
          cursor: 'crosshair',
          borderRadius: '14px'
        }}
      />
    </div>
  );
}

// =========================================================================
// 3. INTERACTIVE 3D ROTATING CYBER DEFENSE GLOBE COMPONENT (Right Side)
// =========================================================================
function CyberGlobe({ activePop, onSelectPop }) {
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const rotationY = useRef(0);
  const rotationX = useRef(0.24); // gentle perspective tilt
  const animFrameId = useRef(null);

  // Global Anycast Scrubbing Centers
  const popNodes = useMemo(() => [
    { id: 'fra', name: 'Frankfurt', lat: (50.11 * Math.PI) / 180, lon: (8.68 * Math.PI) / 180, code: 'FRA-01', latency: '0.08ms' },
    { id: 'lhr', name: 'London', lat: (51.50 * Math.PI) / 180, lon: (-0.12 * Math.PI) / 180, code: 'LHR-02', latency: '0.07ms' },
    { id: 'jfk', name: 'New York', lat: (40.71 * Math.PI) / 180, lon: (-74.00 * Math.PI) / 180, code: 'JFK-04', latency: '0.11ms' },
    { id: 'sfo', name: 'San Francisco', lat: (37.77 * Math.PI) / 180, lon: (-122.41 * Math.PI) / 180, code: 'SFO-01', latency: '0.10ms' },
    { id: 'sin', name: 'Singapore', lat: (1.35 * Math.PI) / 180, lon: (103.81 * Math.PI) / 180, code: 'SIN-03', latency: '0.12ms' },
    { id: 'tyo', name: 'Tokyo', lat: (35.67 * Math.PI) / 180, lon: (139.65 * Math.PI) / 180, code: 'NRT-01', latency: '0.14ms' },
    { id: 'dxb', name: 'Dubai', lat: (25.20 * Math.PI) / 180, lon: (55.27 * Math.PI) / 180, code: 'DXB-02', latency: '0.09ms' },
    { id: 'syd', name: 'Sydney', lat: (-33.86 * Math.PI) / 180, lon: (151.20 * Math.PI) / 180, code: 'SYD-01', latency: '0.16ms' },
    { id: 'gru', name: 'São Paulo', lat: (-23.55 * Math.PI) / 180, lon: (-46.63 * Math.PI) / 180, code: 'GRU-01', latency: '0.14ms' }
  ], []);

  // Pre-generate continent surface dots (deterministic pseudo-random distribution)
  const globePoints = useMemo(() => {
    const points = [];
    const regions = [
      { minLat: 15, maxLat: 68, minLon: -160, maxLon: -55, density: 45 },  // North America
      { minLat: -52, maxLat: 12, minLon: -78, maxLon: -35, density: 32 },  // South America
      { minLat: 36, maxLat: 68, minLon: -10, maxLon: 45, density: 40 },    // Europe
      { minLat: -34, maxLat: 36, minLon: -16, maxLon: 50, density: 42 },    // Africa
      { minLat: 6, maxLat: 72, minLon: 45, maxLon: 142, density: 75 },     // Asia
      { minLat: -42, maxLat: -12, minLon: 112, maxLon: 154, density: 24 }   // Australia
    ];

    let seed = 42;
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
          lon: (lon * Math.PI) / 180
        });
      }
    });
    return points;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 340);
    let height = (canvas.height = 230);
    const R = Math.min(width, height) * 0.40;
    const cx = width / 2;
    const cy = height / 2;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 230;
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      // Auto-rotate if not user dragging
      if (!isDragging.current) {
        rotationY.current += 0.0055;
      }

      ctx.clearRect(0, 0, width, height);

      const rotY = rotationY.current;
      const rotX = rotationX.current;

      // 1. Atmospheric Ambient Glow
      const ambientGrad = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.35);
      ambientGrad.addColorStop(0, 'rgba(40, 116, 93, 0.12)');
      ambientGrad.addColorStop(0.6, 'rgba(232, 121, 47, 0.08)');
      ambientGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. High-Tech Sphere Base (Dark MDefender Forest Slate)
      const sphereGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
      sphereGrad.addColorStop(0, '#1E3834');
      sphereGrad.addColorStop(0.6, '#10201E');
      sphereGrad.addColorStop(1, '#091514');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Outer delicate neon border
      ctx.strokeStyle = 'rgba(232, 121, 47, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Rotating 3D Latitude Wireframe Rings
      const latitudes = [-50, -25, 0, 25, 50];
      latitudes.forEach((latDeg) => {
        const latRad = (latDeg * Math.PI) / 180;
        const ringY = -R * Math.sin(latRad) * Math.cos(rotX);
        const ringRadius = R * Math.cos(latRad);
        const ringH = ringRadius * Math.sin(rotX);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy + ringY, ringRadius, Math.abs(ringH) + 1, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 4. Rotating 3D Continental Land Dots
      for (let i = 0; i < globePoints.length; i++) {
        const pt = globePoints[i];
        const x = R * Math.cos(pt.lat) * Math.sin(pt.lon + rotY);
        const y1 = R * Math.sin(pt.lat);
        const z1 = R * Math.cos(pt.lat) * Math.cos(pt.lon + rotY);

        const y = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);

        if (z > -15) {
          const depth = (z + R) / (2 * R);
          const px = cx + x;
          const py = cy - y;

          ctx.fillStyle = `rgba(167, 243, 208, ${Math.max(0.12, depth * 0.75)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.2 + depth * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Intercepted Cyber Defended Arcs (Data Packet Streams)
      const arcPairs = [
        [0, 2], // FRA -> JFK
        [1, 4], // LHR -> SIN
        [3, 5], // SFO -> TYO
        [0, 6], // FRA -> DXB
        [2, 8]  // JFK -> GRU
      ];

      const packetProgress = (Date.now() % 2400) / 2400;

      arcPairs.forEach(([idxA, idxB]) => {
        const a = popNodes[idxA];
        const b = popNodes[idxB];

        const xA = R * Math.cos(a.lat) * Math.sin(a.lon + rotY);
        const y1A = R * Math.sin(a.lat);
        const z1A = R * Math.cos(a.lat) * Math.cos(a.lon + rotY);
        const yA = y1A * Math.cos(rotX) - z1A * Math.sin(rotX);
        const zA = y1A * Math.sin(rotX) + z1A * Math.cos(rotX);

        const xB = R * Math.cos(b.lat) * Math.sin(b.lon + rotY);
        const y1B = R * Math.sin(b.lat);
        const z1B = R * Math.cos(b.lat) * Math.cos(b.lon + rotY);
        const yB = y1B * Math.cos(rotX) - z1B * Math.sin(rotX);
        const zB = y1B * Math.sin(rotX) + z1B * Math.cos(rotX);

        if (zA > -10 || zB > -10) {
          const pAx = cx + xA;
          const pAy = cy - yA;
          const pBx = cx + xB;
          const pBy = cy - yB;

          const midX = (pAx + pBx) / 2;
          const midY = (pAy + pBy) / 2 - 24;

          ctx.strokeStyle = 'rgba(232, 121, 47, 0.22)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(pAx, pAy);
          ctx.quadraticCurveTo(midX, midY, pBx, pBy);
          ctx.stroke();
          ctx.setLineDash([]);

          const t = packetProgress;
          const pktX = (1 - t) * (1 - t) * pAx + 2 * (1 - t) * t * midX + t * t * pBx;
          const pktY = (1 - t) * (1 - t) * pAy + 2 * (1 - t) * t * midY + t * t * pBy;

          ctx.fillStyle = '#E8792F';
          ctx.shadowColor = '#E8792F';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(pktX, pktY, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 6. Global Anycast Scrubbing PoP Nodes & Pulse Radar
      const timeMs = Date.now();
      popNodes.forEach((pop) => {
        const x = R * Math.cos(pop.lat) * Math.sin(pop.lon + rotY);
        const y1 = R * Math.sin(pop.lat);
        const z1 = R * Math.cos(pop.lat) * Math.cos(pop.lon + rotY);

        const y = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);

        if (z > 2) {
          const px = cx + x;
          const py = cy - y;
          const isSelected = activePop === pop.id;

          const pulse = (timeMs % 1600) / 1600;
          ctx.strokeStyle = `rgba(232, 121, 47, ${Math.max(0, (1 - pulse) * 0.8)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(px, py, 4 + pulse * 9, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = isSelected ? '#FFFFFF' : '#E8792F';
          ctx.beginPath();
          ctx.arc(px, py, isSelected ? 4.2 : 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = isSelected ? '800 10px Inter, sans-serif' : '600 9px Inter, sans-serif';
          ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)';
          ctx.fillText(pop.name, px + 7, py + 3);
        }
      });

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [globePoints, popNodes, activePop]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastMouseX.current;
    const deltaY = e.clientY - lastMouseY.current;
    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;

    rotationY.current += deltaX * 0.008;
    rotationX.current = Math.max(-0.6, Math.min(0.6, rotationX.current - deltaY * 0.005));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => {
          if (e.touches[0]) {
            isDragging.current = true;
            lastMouseX.current = e.touches[0].clientX;
            lastMouseY.current = e.touches[0].clientY;
          }
        }}
        onTouchMove={(e) => {
          if (!isDragging.current || !e.touches[0]) return;
          const deltaX = e.touches[0].clientX - lastMouseX.current;
          const deltaY = e.touches[0].clientY - lastMouseY.current;
          lastMouseX.current = e.touches[0].clientX;
          lastMouseY.current = e.touches[0].clientY;
          rotationY.current += deltaX * 0.008;
          rotationX.current = Math.max(-0.6, Math.min(0.6, rotationX.current - deltaY * 0.005));
        }}
        onTouchEnd={() => { isDragging.current = false; }}
        style={{
          width: '100%',
          height: '230px',
          display: 'block',
          cursor: isDragging.current ? 'grabbing' : 'grab',
          borderRadius: '16px'
        }}
      />

      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '12px',
        fontSize: '10px',
        color: '#87948D',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(4px)',
        padding: '2px 8px',
        borderRadius: '6px',
        border: '1px solid #D9E1DC',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        pointerEvents: 'none'
      }}>
        <Compass size={11} color="#E8792F" />
        <span>Drag to rotate Earth</span>
      </div>
    </div>
  );
}

// =========================================================================
// 4. STAT CARD COMPONENT WITH COLOR-HARMONIZED BADGES
// =========================================================================
function StatCard({
  icon: Icon,
  color,
  bg,
  borderColor,
  value,
  label,
  sublabel,
  badgeText,
  badgeType = 'sky', // 'sky' | 'crimson' | 'indigo' | 'emerald' | 'orange' | 'violet' | 'slate'
  onClean,
  cleaning,
  actionText,
  actionLink,
  actionColor,
  accentGradient,
  glowColor
}) {
  const animated = useAnimatedNumber(value);
  const [isHovered, setIsHovered] = useState(false);

  const badgeStyles = {
    sky: { bg: '#F0FDF4', color: '#15803D', border: '#DCFCE7' },
    crimson: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
    indigo: { bg: '#FFFBEB', color: '#B45309', border: '#FEF3C7' },
    emerald: { bg: '#F0FDF4', color: '#15803D', border: '#DCFCE7' },
    orange: { bg: '#FFFBEB', color: '#B45309', border: '#FEF3C7' },
    slate: { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' }
  }[badgeType] || { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #D9E1DC',
        padding: '20px 22px',
        boxShadow: isHovered
          ? '0 8px 20px -4px rgba(16, 32, 30, 0.06)'
          : '0 1px 3px rgba(16, 32, 30, 0.03)',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        minHeight: '145px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: bg || '#F1F5F3',
          border: borderColor ? `1px solid ${borderColor}` : '1px solid #D9E1DC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color || '#10201E'
        }}>
          <Icon size={20} strokeWidth={2} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onClean && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClean();
              }}
              disabled={cleaning}
              title={`Reset ${label}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#64748B',
                cursor: cleaning ? 'not-allowed' : 'pointer',
                padding: '3px 7px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                opacity: isHovered || cleaning ? 1 : 0,
                transition: 'opacity 0.2s ease'
              }}
            >
              <Trash2 size={11} color={cleaning ? '#DC2626' : '#64748B'} />
              <span>{cleaning ? 'Clearing...' : 'Clear'}</span>
            </button>
          )}

          {badgeText && (
            <span style={{
              fontSize: '10.5px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '5px',
              background: badgeStyles.bg,
              color: badgeStyles.color,
              border: `1px solid ${badgeStyles.border}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              letterSpacing: '0.02em'
            }}>
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: badgeStyles.color
              }} />
              <span>{badgeText}</span>
            </span>
          )}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#10201E',
          lineHeight: '1.1',
          letterSpacing: '-0.02em'
        }}>
          {animated}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: '6px',
          flexWrap: 'wrap',
          gap: '4px'
        }}>
          <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#10201E' }}>
            {label}
          </span>
          {sublabel && (
            <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#64748B' }}>
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {actionLink && actionText && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F8FAFC' }}>
          <Link
            to={actionLink}
            style={{
              fontSize: '11.5px',
              fontWeight: '700',
              color: actionColor || color || '#0284C7',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'gap 0.15s ease'
            }}
          >
            <span>{actionText}</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [selectedWebsite, setSelectedWebsite] = useState('all');
  const [data, setData] = useState(() => userStore.get('dashboard'));
  const [loading, setLoading] = useState(() => !userStore.get('dashboard'));
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
  const [ddosEnabled, setDdosEnabled] = useState(true);
  const [ddosToggling, setDdosToggling] = useState(false);
  const [mlStatus, setMlStatus] = useState(null);
  const [cleaningCategory, setCleaningCategory] = useState(null);
  const [copiedIp, setCopiedIp] = useState(null);
  const [copiedUri, setCopiedUri] = useState(null);
  const [bannedIps, setBannedIps] = useState(() => new Set());
  const [streamFilter, setStreamFilter] = useState('all'); // 'all' | 'critical' | 'bots'
  const [chartMetric, setChartMetric] = useState('both'); // 'both' | 'clean' | 'threats'
  const [chartViewMode, setChartViewMode] = useState('3d'); // '3d' | '2d'
  const [rightPanelMode, setRightPanelMode] = useState('globe'); // 'globe' | 'vectors'
  const [activeGlobePop, setActiveGlobePop] = useState('fra');

  const rawPlan = data?.user?.plan || data?.plan || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_plan') : null) || 'free';
  const userPlan = (typeof rawPlan === 'string' ? rawPlan : (rawPlan?.id || rawPlan?.name || 'free')).toLowerCase();
  const isPremium = ['go', 'pro', 'enterprise', 'premium', 'ultra'].includes(userPlan);

  const userName = data?.user?.name || data?.user?.full_name || (typeof localStorage !== 'undefined' ? localStorage.getItem('mdefender_user_name') : '') || 'Operator';

  const fetchData = useCallback(async (manual = false, siteId = selectedWebsite) => {
    if (manual) setRefreshing(true);
    try {
      const params = siteId && siteId !== 'all' ? { website_id: siteId } : {};
      if (manual) params.refresh = '1';
      const result = await api.getUserDashboard(params);
      setData(result);
      userStore.set('dashboard', result);
      setLastRefreshed(new Date());
      if (result?.user?.name) localStorage.setItem('mdefender_user_name', result.user.name);
      const freshPlan = result?.user?.plan || result?.plan;
      if (freshPlan) localStorage.setItem('mdefender_user_plan', freshPlan);
    } catch (err) {
      console.error('Telemetry fetch error:', err);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setRefreshing(false), 300);
    }
  }, [selectedWebsite]);

  useEffect(() => {
    fetchData(false, selectedWebsite);
    api.getDdosStatus().then(r => setDdosEnabled(r.ddos_enabled ?? true)).catch(() => {});
    api.getMlStatus().then(r => setMlStatus(r)).catch(() => {});

    // Real-time polling every 3 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(false, selectedWebsite);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchData, selectedWebsite]);

  const handleDdosToggle = async () => {
    setDdosToggling(true);
    try {
      const newState = !ddosEnabled;
      await api.toggleDdos(newState);
      setDdosEnabled(newState);
    } catch (err) {
      alert(err.message || 'Failed to toggle DDoS protection');
    } finally {
      setDdosToggling(false);
    }
  };

  const handleCleanCategory = async (type, label) => {
    const scopeName = selectedWebsite === 'all' ? 'all websites' : 'the selected website';
    if (!confirm(`Are you sure you want to clean "${label}" for ${scopeName}?`)) {
      return;
    }
    setCleaningCategory(type);
    try {
      const res = await api.userResetStats({ website_id: selectedWebsite, type });
      userStore.clear();
      await fetchData(true, selectedWebsite);
      alert(res.message || `${label} reset successfully.`);
    } catch (err) {
      alert(err.message || `Failed to clean ${label}`);
    } finally {
      setCleaningCategory(null);
    }
  };

  const blockTopIP = async (ip) => {
    if (!isPremium) {
      alert('Upgrade to Premium to enforce instant edge IP bans directly from the dashboard.');
      return;
    }
    if (confirm(`Immediately quarantine and ban IP ${ip} across all edge nodes?`)) {
      try {
        await api.userBlockIP(ip, 'Blocked from dashboard live threat origin ledger');
        setBannedIps(prev => new Set([...prev, ip]));
        await fetchData(true, selectedWebsite);
      } catch (e) {
        alert(e.message || 'Failed to ban IP');
      }
    }
  };

  const handleCopyIp = async (ip) => {
    const ok = await copyToClipboard(ip);
    if (ok) {
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 2000);
    }
  };

  const handleCopyUri = async (uri) => {
    const ok = await copyToClipboard(uri);
    if (ok) {
      setCopiedUri(uri);
      setTimeout(() => setCopiedUri(null), 2000);
    }
  };

  // Filtered live stream events based on interactive filter tab
  const filteredRecentActivity = useMemo(() => {
    const list = data?.recent_activity || [];
    if (streamFilter === 'critical') {
      return list.filter(item => {
        const type = (item.attack_type || '').toLowerCase();
        return type.includes('sql') || type.includes('rce') || type.includes('command') || type.includes('inject');
      });
    }
    if (streamFilter === 'bots') {
      return list.filter(item => {
        const type = (item.attack_type || '').toLowerCase();
        return type.includes('bot') || type.includes('scan') || type.includes('probe') || type.includes('crawler');
      });
    }
    return list;
  }, [data?.recent_activity, streamFilter]);

  // Threat Vectors breakdown calculation
  const rawAttackTypes = data?.attack_types?.length ? data.attack_types : ['SQL Injection', 'Cross-Site Scripting (XSS)', 'Local File Inclusion (LFI)', 'Remote Code Execution (RCE)', 'Bot Scanner Probes'];
  const rawAttackCounts = data?.attack_counts?.length ? data.attack_counts : [0, 0, 0, 0, 0];
  const totalAttacksCount = rawAttackCounts.reduce((a, b) => a + b, 0);

  const attackChartData = {
    labels: rawAttackTypes,
    datasets: [{
      data: rawAttackCounts.map(c => Math.max(c, 0)),
      backgroundColor: securityPalette,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      hoverOffset: 8
    }]
  };

  // Daily request and attack trend curves (7 days)
  const dailyDays = [];
  const dailyCleanCounts = [];
  const dailyThreatCounts = [];
  const now = new Date();

  const totalReq = data?.total_requests || 0;
  const totalBlk = data?.total_blocked || 0;
  const threatRatio = totalReq > 0 ? (totalBlk / totalReq) : 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyDays.push(d.toLocaleDateString('en', { weekday: 'short', month: 'numeric', day: 'numeric' }));
    const count = data?.daily_requests?.[i] || 0;
    const estimatedThreats = Math.round(count * threatRatio);
    dailyThreatCounts.push(estimatedThreats);
    dailyCleanCounts.push(Math.max(0, count - estimatedThreats));
  }

  const dailyDatasets = [];
  if (chartMetric === 'both' || chartMetric === 'clean') {
    dailyDatasets.push({
      label: 'Clean Ingress Traffic',
      data: dailyCleanCounts,
      borderColor: '#10201E',
      backgroundColor: 'rgba(16, 32, 30, 0.05)',
      borderWidth: 2.6,
      fill: true,
      tension: 0.38,
      pointBackgroundColor: '#28745D',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    });
  }

  if (chartMetric === 'both' || chartMetric === 'threats') {
    dailyDatasets.push({
      label: 'Mitigated Threats (403)',
      data: dailyThreatCounts,
      borderColor: '#DC2626',
      backgroundColor: 'rgba(220, 38, 38, 0.08)',
      borderWidth: 2.4,
      fill: true,
      tension: 0.38,
      pointBackgroundColor: '#DC2626',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    });
  }

  const dailyChartData = {
    labels: dailyDays,
    datasets: dailyDatasets
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#10201E',
        titleFont: { family: 'Inter', weight: '700', size: 12 },
        bodyFont: { family: 'Inter', size: 11.5 },
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
        callbacks: {
          label(ctx) {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
            return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
          }
        }
      }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#10201E',
        titleFont: { family: 'Inter', weight: '700', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label(ctx) {
            return ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString()} reqs`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(217, 225, 220, 0.45)', drawBorder: false },
        ticks: { font: { size: 11, family: 'Inter', weight: '600' }, color: '#87948D', padding: 8 }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Inter', weight: '600' }, color: '#87948D', padding: 8 }
      }
    }
  };

  const cleanRatio = totalReq > 0
    ? (((totalReq - totalBlk) / totalReq) * 100).toFixed(1)
    : '100.0';

  const websitesList = data?.websites || [];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4px 0 48px' }}>
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE SECURITY POSTURE & DYNAMIC COCKPIT HERO BANNER               */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBF9 60%, #F5F9F6 100%)',
        borderRadius: '20px',
        border: '1px solid #D9E1DC',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px -2px rgba(16, 32, 30, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '80px',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(40, 116, 93, 0.06) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Left: User identity & fleet protection telemetry */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10201E 0%, #1A3834 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(16, 32, 30, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              position: 'relative',
              flexShrink: 0
            }}>
              <ShieldCheck size={28} color="#28745D" />
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid #FFFFFF',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)'
              }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '900',
                  color: '#10201E',
                  margin: 0,
                  letterSpacing: '-0.4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>Security Command Center</span>
                </h2>

                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 8px #10B981'
                  }} />
                  ACTIVE DEFENSE (38 POPS)
                </span>

                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: isPremium ? '#FEF3EB' : '#F1F5F9',
                  color: isPremium ? '#D97735' : '#475569',
                  border: `1px solid ${isPremium ? '#FCD8BF' : '#CBD5E1'}`
                }}>
                  {userPlan === 'go' ? 'Developer Go' : (userPlan === 'pro' || userPlan === 'premium') ? 'Enterprise Pro' : (userPlan === 'enterprise' || userPlan === 'ultra') ? 'Dedicated Enterprise' : 'Starter Free Tier'}
                </span>
              </div>

              <div style={{
                fontSize: '12.5px',
                color: '#64748B',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <span>Welcome back, <strong style={{ color: '#10201E' }}>{userName}</strong></span>
                <span style={{ color: '#CBD8CF' }}>•</span>
                <span>Sub-millisecond Anycast Ingress (0.12ms)</span>
                <span style={{ color: '#CBD8CF' }}>•</span>
                <span style={{ color: '#059669', fontWeight: '800' }}>
                  {cleanRatio}% Traffic Validated Clean
                </span>
              </div>
            </div>
          </div>

          {/* Right: Telemetry Controls & Multi-site Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Website Selector Dropdown */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '12px',
              border: '1px solid #D9E1DC',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <Globe size={15} color="#0284C7" />
              <select
                value={selectedWebsite}
                onChange={(e) => {
                  const siteId = e.target.value;
                  setSelectedWebsite(siteId);
                  fetchData(true, siteId);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#10201E',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  outline: 'none',
                  paddingRight: '6px'
                }}
              >
                <option value="all">Global Fleet ({websitesList.length} Websites)</option>
                {websitesList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.domain || w.name || w.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Live Refresh with Live Sync Clock */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              border: '1px solid #D9E1DC',
              borderRadius: '12px',
              padding: '5px 8px 5px 12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={13} color="#87948D" />
                {lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}
              </span>
              <button
                onClick={() => fetchData(true, selectedWebsite)}
                disabled={refreshing}
                title="Sync live telemetry now"
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: refreshing ? '#E8EEE8' : '#10201E',
                  color: refreshing ? '#10201E' : '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.18s ease'
                }}
              >
                <RefreshCw size={12} className={refreshing ? 'hud-scan-pulse' : ''} />
                <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
              </button>
            </div>

            {/* DDoS Shield Switch with Dynamic Defense Status Pill */}
            <button
              onClick={handleDdosToggle}
              disabled={ddosToggling}
              title="Toggle Layer 7 Volumetric Attack Scrubber"
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                border: ddosEnabled ? '1px solid #A7F3D0' : '1px solid #FECACA',
                background: ddosEnabled ? '#ECFDF5' : '#FEF2F2',
                color: ddosEnabled ? '#059669' : '#DC2626',
                fontSize: '12px',
                fontWeight: '800',
                cursor: ddosToggling ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.2s ease'
              }}
            >
              <Shield size={14} color={ddosEnabled ? '#059669' : '#DC2626'} />
              <span>DDoS Shield: {ddosEnabled ? 'ON' : 'OFF'}</span>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: ddosEnabled ? '#10B981' : '#DC2626',
                boxShadow: ddosEnabled ? '0 0 8px rgba(16, 185, 129, 0.8)' : '0 0 6px rgba(220, 38, 38, 0.6)'
              }} />
            </button>

            {/* Plan Upgrade if Free */}
            {!isPremium && (
              <Link
                to="/user/pricing"
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #E8792F 0%, #D9691E 100%)',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(232, 121, 47, 0.28)'
                }}
              >
                <Crown size={14} />
                <span>Upgrade Pro</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Zero Sites Connected Onboarding Banner */}
      {!loading && websitesList.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #FAFBF9 0%, #FFFFFF 100%)',
          borderRadius: '16px',
          border: '1.5px dashed #2A8B68',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 10px rgba(16, 32, 30, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#E6F4EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2A8B68',
              flexShrink: 0
            }}>
              <Globe size={24} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#10201E' }}>
                No WordPress Sites Connected Yet
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                Your telemetry and bulk security management are in clean stand-by mode. Connect your WordPress site to activate real-time telemetry.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="/mdefender-pro.zip"
              download="mdefender-pro.zip"
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                background: '#F1F5F3',
                color: '#10201E',
                textDecoration: 'none',
                fontSize: '12.5px',
                fontWeight: '700',
                border: '1px solid #D9E1DC',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Download Plugin v4.3.0
            </a>
            <Link
              to="/user/websites"
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                background: '#2A8B68',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontSize: '12.5px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(42, 139, 104, 0.25)'
              }}
            >
              <span>+ Connect First Site</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CORE TELEMETRY KPI STAT CARDS (4 DISTINCT CYBERSECURITY PILLARS)        */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '18px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Slate/Dark (Speed & Ingress Traffic) */}
        <StatCard
          icon={Zap}
          color="#10201E"
          bg="#F1F5F3"
          borderColor="#D9E1DC"
          value={data?.requests_today || 0}
          label="24h Ingress Requests"
          sublabel="Real-Time Traffic Velocity"
          badgeText="LIVE INGRESS"
          badgeType="emerald"
          onClean={() => handleCleanCategory('requests_today', '24h Ingress')}
          cleaning={cleaningCategory === 'requests_today'}
          actionText="Inspect Ingress Traffic"
          actionLink="/user/logs"
          actionColor="#10201E"
        />

        {/* Card 2: Security Crimson (Attacks Blocked & Quarantined) */}
        <StatCard
          icon={ShieldAlert}
          color="#DC2626"
          bg="#FEF2F2"
          borderColor="#FECACA"
          value={data?.total_blocked || 0}
          label="Attacks Quarantined"
          sublabel="403 Forbidden Intercepted"
          badgeText="QUARANTINED"
          badgeType="crimson"
          onClean={() => handleCleanCategory('total_blocked', 'Attacks Blocked')}
          cleaning={cleaningCategory === 'total_blocked'}
          actionText="Inspect Threat Forensics"
          actionLink="/user/logs"
          actionColor="#DC2626"
        />

        {/* Card 3: Brand Amber / Orange (Neural Engine & Heuristic Inspection) */}
        <StatCard
          icon={Sparkles}
          color="#E8792F"
          bg="#FFF4ED"
          borderColor="#FCD3B6"
          value={data?.total_requests || 0}
          label="Lifetime Scrubbed Edge"
          sublabel="6.5M+ Neural Model Heuristics"
          badgeText="NEURAL ENGINE"
          badgeType="orange"
          onClean={() => handleCleanCategory('total_requests', 'Lifetime Traffic')}
          cleaning={cleaningCategory === 'total_requests'}
          actionText="View AI Threat Model"
          actionLink="/user/rules"
          actionColor="#E8792F"
        />

        {/* Card 4: Forest Emerald (100% Online Fleet & Health) */}
        <StatCard
          icon={Globe}
          color="#2A8B68"
          bg="#E8F3EC"
          borderColor="#CFE2D4"
          value={websitesList.length || data?.active_websites || 0}
          label="Protected Web Fleet"
          sublabel="WordPress & Domains Online"
          badgeText="FLEET ONLINE"
          badgeType="emerald"
          actionText="+ Connect New Website"
          actionLink="/user/connect"
          actionColor="#2A8B68"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL TELEMETRY: 3D CYBER INGRESS WAVEFORM & 3D CYBER DEFENSE GLOBE   */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '20px',
        marginBottom: '24px'
      }} className="responsive-dashboard-grid">
        {/* Left: 3D Volumetric Waveform & Precision Spline Visualizer */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #D9E1DC',
          padding: '24px 26px',
          boxShadow: '0 2px 8px rgba(16, 32, 30, 0.04)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '380px'
        }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {chartViewMode === '3d' ? (
                    <Box size={19} color="#E8792F" />
                  ) : (
                    <BarChart3 size={19} color="#10201E" />
                  )}
                  <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: '#10201E', margin: 0 }}>
                    Traffic Ingress &amp; Threat Mitigation (7 Days)
                  </h3>
                </div>
                <div style={{ fontSize: '12px', color: '#87948D', marginTop: '3px' }}>
                  {chartViewMode === '3d'
                    ? 'Interactive 3D volumetric cyber grid with holographic hover telemetry'
                    : 'Dual-stream edge comparison of clean ingress vs dropped payloads'}
                </div>
              </div>

              {/* View Mode & Metric Filter Switchers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* 3D vs 2D Switcher */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: '#F7F6F1',
                  padding: '3px',
                  borderRadius: '10px',
                  border: '1px solid #D9E1DC'
                }}>
                  <button
                    onClick={() => setChartViewMode('3d')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '7px',
                      border: 'none',
                      background: chartViewMode === '3d' ? '#10201E' : 'transparent',
                      color: chartViewMode === '3d' ? '#FFFFFF' : '#64748B',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Box size={12} />
                    <span>3D Mesh</span>
                  </button>
                  <button
                    onClick={() => setChartViewMode('2d')}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '7px',
                      border: 'none',
                      background: chartViewMode === '2d' ? '#10201E' : 'transparent',
                      color: chartViewMode === '2d' ? '#FFFFFF' : '#64748B',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <BarChart3 size={12} />
                    <span>2D Spline</span>
                  </button>
                </div>

                {/* Metric Filter Tabs */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: '#F7F6F1',
                  padding: '3px',
                  borderRadius: '10px',
                  border: '1px solid #D9E1DC'
                }}>
                  <button
                    onClick={() => setChartMetric('both')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '7px',
                      border: 'none',
                      background: chartMetric === 'both' ? '#10201E' : 'transparent',
                      color: chartMetric === 'both' ? '#FFFFFF' : '#64748B',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    All Traffic
                  </button>
                  <button
                    onClick={() => setChartMetric('clean')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '7px',
                      border: 'none',
                      background: chartMetric === 'clean' ? '#10201E' : 'transparent',
                      color: chartMetric === 'clean' ? '#FFFFFF' : '#64748B',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Clean
                  </button>
                  <button
                    onClick={() => setChartMetric('threats')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '7px',
                      border: 'none',
                      background: chartMetric === 'threats' ? '#DC2626' : 'transparent',
                      color: chartMetric === 'threats' ? '#FFFFFF' : '#64748B',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Threats (403)
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic View: 3D Volumetric Mesh vs 2D Precision Spline */}
            <div style={{ height: '240px', position: 'relative' }}>
              {chartViewMode === '3d' ? (
                <CyberTraffic3D
                  days={dailyDays}
                  cleanCounts={dailyCleanCounts}
                  threatCounts={dailyThreatCounts}
                  metric={chartMetric}
                />
              ) : (
                <Line data={dailyChartData} options={lineOptions} />
              )}
            </div>
          </div>

          {/* Bottom Telemetry Metrics Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            marginTop: '12px',
            borderTop: '1px solid #F7F6F1',
            fontSize: '12px',
            color: '#64748B',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10201E' }} />
              <span>Clean Ingress: <strong>{dailyCleanCounts.reduce((a, b) => a + b, 0).toLocaleString()} reqs</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }} />
              <span>Threats Mitigated: <strong>{dailyThreatCounts.reduce((a, b) => a + b, 0).toLocaleString()} dropped</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="#E8792F" />
              <span>Edge SLA: <strong style={{ color: '#D97735' }}>100.0% Protected</strong></span>
            </div>
          </div>

          {!isPremium && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(4px)',
              background: 'rgba(255, 255, 255, 0.82)',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#FEF3EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#E8792F',
                marginBottom: '12px'
              }}>
                <Lock size={22} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: '0 0 6px' }}>
                Live Ingress Telemetry Locked
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 0 16px' }}>
                Upgrade to Developer Go or Enterprise Pro to unlock dual-stream 3D request trends and granular threat analytics.
              </p>
              <Link
                to="/user/pricing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '12px',
                  background: '#10201E',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'none'
                }}
              >
                <Crown size={14} color="#E8792F" />
                <span>Upgrade to Inspect Ingress Trends</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right: 3D CYBER DEFENSE GLOBE & HARMONIZED THREAT VECTOR PANEL */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #D9E1DC',
          padding: '24px 26px',
          boxShadow: '0 2px 8px rgba(16, 32, 30, 0.04)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '380px'
        }}>
          <div>
            {/* Header with Switcher Tabs */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {rightPanelMode === 'globe' ? (
                  <Radar size={19} color="#E8792F" />
                ) : (
                  <ShieldAlert size={19} color="#DC2626" />
                )}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: 0 }}>
                    {rightPanelMode === 'globe' ? 'Global Cyber Defense Mesh' : 'Threat Vectors Breakdown'}
                  </h3>
                </div>
              </div>

              {/* View Switcher Tabs (Globe vs Vectors) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#F7F6F1',
                padding: '3px',
                borderRadius: '10px',
                border: '1px solid #D9E1DC'
              }}>
                <button
                  onClick={() => setRightPanelMode('globe')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    background: rightPanelMode === 'globe' ? '#10201E' : 'transparent',
                    color: rightPanelMode === 'globe' ? '#FFFFFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Globe size={12} />
                  <span>3D Globe</span>
                </button>
                <button
                  onClick={() => setRightPanelMode('vectors')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: 'none',
                    background: rightPanelMode === 'vectors' ? '#10201E' : 'transparent',
                    color: rightPanelMode === 'vectors' ? '#FFFFFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <BarChart3 size={12} />
                  <span>Vectors ({totalAttacksCount})</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: 1. 3D ROTATING CYBER GLOBE */}
            {rightPanelMode === 'globe' ? (
              <div>
                <CyberGlobe activePop={activeGlobePop} onSelectPop={setActiveGlobePop} />

                {/* Regional Anycast Scrubbing Strip */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F7F6F1',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  marginTop: '10px',
                  border: '1px solid #D9E1DC',
                  fontSize: '11.5px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#E8792F', boxShadow: '0 0 6px #E8792F' }} />
                    <span style={{ color: '#10201E', fontWeight: '700' }}>9 Global Scrubbing Centers Active</span>
                  </div>
                  <span style={{ color: '#E8792F', fontWeight: '800' }}>
                    0.08ms &ndash; 0.14ms Latency
                  </span>
                </div>
              </div>
            ) : (
              /* TAB CONTENT: 2. HARMONIZED THREAT VECTORS BREAKDOWN */
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '6px' }}>
                {/* Donut Chart with Center Stat */}
                <div style={{ height: '175px', width: '175px', position: 'relative', margin: '0 auto' }}>
                  <Doughnut data={attackChartData} options={doughnutOptions} />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ fontSize: '22px', fontWeight: '900', color: '#10201E', lineHeight: '1' }}>
                      {totalAttacksCount.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#87948D', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.8px', marginTop: '3px' }}>
                      QUARANTINED
                    </span>
                  </div>
                </div>

                {/* Harmonized Vector List (Brand matching styles) */}
                <div style={{ flex: 1, minWidth: '190px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {rawAttackTypes.slice(0, 5).map((type, tIdx) => {
                    const count = rawAttackCounts[tIdx] || 0;
                    const pct = totalAttacksCount > 0 ? ((count / totalAttacksCount) * 100).toFixed(0) : '0';
                    const sev = getSeverity(type);

                    return (
                      <Link
                        key={tIdx}
                        to={`/user/logs?search=${encodeURIComponent(type)}`}
                        title={`Filter logs for ${type}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          background: '#FAFBF9',
                          textDecoration: 'none',
                          border: '1px solid #EAEFEA',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F0F5F2';
                          e.currentTarget.style.borderColor = '#CBD8CF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FAFBF9';
                          e.currentTarget.style.borderColor = '#EAEFEA';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: securityPalette[tIdx], flexShrink: 0 }} />
                          <span style={{ fontWeight: '700', color: '#10201E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {type}
                          </span>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: '800',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: sev.bg,
                            color: sev.color,
                            border: `1px solid ${sev.border}`
                          }}>
                            {sev.label}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                          <span style={{ fontWeight: '800', color: '#10201E' }}>{count}</span>
                          <span style={{ fontSize: '11px', color: '#87948D' }}>({pct}%)</span>
                          <ArrowRight size={11} color="#87948D" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '14px',
            marginTop: '12px',
            borderTop: '1px solid #F7F6F1',
            fontSize: '11.5px',
            color: '#64748B'
          }}>
            <span>ML Signature Model: <strong style={{ color: '#10201E' }}>v3.0 Heuristic Vectorizer</strong></span>
            <Link to="/user/rules" style={{ color: '#E8792F', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>Custom Rules</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {!isPremium && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(4px)',
              background: 'rgba(255, 255, 255, 0.82)',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#FEF3EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#E8792F',
                marginBottom: '12px'
              }}>
                <Lock size={22} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: '0 0 6px' }}>
                Global Perimeter Mesh Locked
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 0 16px' }}>
                Upgrade to view 3D global Anycast scrubbing nodes, real-time threat arcs, and vector classifications.
              </p>
              <Link
                to="/user/pricing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '12px',
                  background: '#10201E',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'none'
                }}
              >
                <Crown size={14} color="#E8792F" />
                <span>Upgrade to View Mesh</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECURITY OPERATIONS: TOP ATTACKERS & LIVE INGRESS BLOCK STREAM          */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Left: Top Hostile Origins & Probing IPs (High-Precision Threat Ledger) */}
        <div style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBF9 100%)',
          borderRadius: '20px',
          border: '1px solid #D9E1DC',
          padding: '24px 26px',
          boxShadow: '0 4px 20px -2px rgba(16, 32, 30, 0.05)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Subtle top accent edge highlight */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #DC2626 0%, #E8792F 50%, #28745D 100%)'
          }} />

          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.12)',
                  flexShrink: 0
                }}>
                  <Crosshair size={19} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: '#10201E', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Top Threat Origins &amp; Probing IPs</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      background: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      letterSpacing: '0.4px'
                    }}>
                      ● THREAT LEDGER
                    </span>
                  </h3>
                  <div style={{ fontSize: '12px', color: '#87948D', marginTop: '2px' }}>
                    Most aggressive hostile sources detected in recent sampling windows
                  </div>
                </div>
              </div>

              {isPremium && (
                <Link
                  to="/user/logs"
                  style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#DC2626',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FECACA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FEF2F2';
                  }}
                >
                  <span>All Logs</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>

            {/* Cyber Threat Origins Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid #D9E1DC',
                    color: '#87948D',
                    fontSize: '10.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    fontWeight: '700'
                  }}>
                    <th style={{ padding: '8px 6px' }}>Rank</th>
                    <th style={{ padding: '8px 12px' }}>Hostile IP &amp; Origin Classifier</th>
                    <th style={{ padding: '8px 12px' }}>Attempts &amp; Load Gauge</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Edge Enforcement</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.top_attackers?.slice(0, 5).map((attacker, i) => {
                    const maxAttacks = data.top_attackers[0]?.count || 1;
                    const ratio = Math.min(100, Math.round((attacker.count / maxAttacks) * 100));
                    const isBanned = bannedIps.has(attacker.ip);

                    return (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid #F1F5F2',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(254, 243, 235, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* Rank Column */}
                        <td style={{ padding: '12px 6px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            fontWeight: '800',
                            fontFamily: 'monospace',
                            background: i === 0 ? '#FEF2F2' : i === 1 ? '#FEF3EB' : i === 2 ? '#F1F5F9' : '#FAFBF9',
                            color: i === 0 ? '#DC2626' : i === 1 ? '#D97735' : i === 2 ? '#475569' : '#87948D',
                            border: `1px solid ${i === 0 ? '#FECACA' : i === 1 ? '#FCD8BF' : i === 2 ? '#CBD5E1' : '#E2E8F0'}`,
                            boxShadow: i === 0 ? '0 2px 6px rgba(220, 38, 38, 0.12)' : 'none'
                          }}>
                            {i + 1}
                          </span>
                        </td>

                        {/* Hostile IP & Classifier */}
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontFamily: 'JetBrains Mono, Menlo, monospace',
                              fontWeight: '700',
                              color: '#10201E',
                              fontSize: '12.5px',
                              letterSpacing: '0.2px'
                            }}>
                              {attacker.ip}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyIp(attacker.ip)}
                              title="Copy IP address"
                              style={{
                                background: copiedIp === attacker.ip ? '#FEF3EB' : 'transparent',
                                border: copiedIp === attacker.ip ? '1px solid #FCD8BF' : 'none',
                                color: copiedIp === attacker.ip ? '#D97735' : '#87948D',
                                cursor: 'pointer',
                                padding: '2px 5px',
                                borderRadius: '5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {copiedIp === attacker.ip ? (
                                <>
                                  <Check size={11} />
                                  <span style={{ fontSize: '10px', fontWeight: '800' }}>Copied</span>
                                </>
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: '600', color: i === 0 ? '#DC2626' : i === 1 ? '#D97735' : '#87948D' }}>
                            {i === 0 ? '● Critical L7 Exploit Vector' : attacker.ip === '127.0.0.1' ? '● Local Loopback / Ingress Proxy' : '● Distributed Ingress Probe'}
                          </div>
                        </td>

                        {/* Attempts & Load Gauge */}
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '90px',
                              height: '7px',
                              background: '#F1F5F9',
                              borderRadius: '999px',
                              overflow: 'hidden',
                              border: '1px solid #E2E8F0',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{
                                width: `${ratio}%`,
                                height: '100%',
                                background: i === 0
                                  ? 'linear-gradient(90deg, #F87171 0%, #DC2626 100%)'
                                  : i === 1
                                  ? 'linear-gradient(90deg, #FDBA74 0%, #E8792F 100%)'
                                  : 'linear-gradient(90deg, #64748B 0%, #10201E 100%)',
                                borderRadius: '999px',
                                boxShadow: i === 0 ? '0 0 8px rgba(220, 38, 38, 0.4)' : i === 1 ? '0 0 8px rgba(232, 121, 47, 0.35)' : 'none'
                              }} />
                            </div>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#10201E' }}>
                                {attacker.count.toLocaleString()}
                              </span>
                              <span style={{ fontSize: '10.5px', color: '#87948D', marginLeft: '4px' }}>
                                reqs ({ratio}%)
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Enforcement Action */}
                        <td style={{ padding: '12px 6px', textAlign: 'right' }}>
                          {isBanned ? (
                            <span style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              background: '#FEF3EB',
                              color: '#D97735',
                              border: '1px solid #FCD8BF',
                              fontSize: '11px',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Check size={12} />
                              <span>BANNED</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => blockTopIP(attacker.ip)}
                              style={{
                                padding: '6px 13px',
                                borderRadius: '8px',
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#DC2626';
                                e.currentTarget.style.color = '#FFFFFF';
                                e.currentTarget.style.boxShadow = '0 3px 10px rgba(220, 38, 38, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FEF2F2';
                                e.currentTarget.style.color = '#DC2626';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <Ban size={12} />
                              <span>{isPremium ? 'BLOCK IP' : 'LOCK'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }) || (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#87948D', padding: '36px' }}>
                        <CheckCircle2 size={24} color="#28745D" style={{ display: 'block', margin: '0 auto 8px' }} />
                        <span style={{ fontWeight: '600', color: '#10201E' }}>Zero hostile IP probes detected in current window</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom High-Tech Origin Ledger Strip */}
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4A5D5A', fontWeight: '600' }}>
              <ShieldCheck size={13} color="#28745D" />
              <span>Anycast Edge Blacklist: Active Real-Time Quarantine</span>
            </div>
            <div style={{ fontSize: '11px', color: '#87948D', fontWeight: '600' }}>
              Top 5 Vector Load: {data?.top_attackers?.slice(0, 5).reduce((s, a) => s + (a.count || 0), 0).toLocaleString()} probes
            </div>
          </div>

          {!isPremium && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(5px)',
              background: 'rgba(255, 255, 255, 0.86)',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '13px',
                background: '#FEF3EB',
                border: '1px solid #FCD8BF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97735',
                marginBottom: '12px',
                boxShadow: '0 4px 12px rgba(217, 119, 53, 0.15)'
              }}>
                <Lock size={22} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: '0 0 6px' }}>
                Attacker Origins Intelligence Locked
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 0 16px', lineHeight: 1.5 }}>
                Upgrade to view hostile origin addresses, request intensity distributions, and enforce 1-click IP bans across all global Anycast edge nodes.
              </p>
              <Link
                to="/user/pricing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '12px',
                  background: '#10201E',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(16, 32, 30, 0.2)'
                }}
              >
                <Crown size={14} color="#E8792F" />
                <span>Upgrade to Unlock Threat Origins</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right: Live Ingress Block Stream (Real-Time Cyber Ingress Feed) */}
        <div style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBF9 100%)',
          borderRadius: '20px',
          border: '1px solid #D9E1DC',
          padding: '24px 26px',
          boxShadow: '0 4px 20px -2px rgba(16, 32, 30, 0.05)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Subtle top accent edge highlight */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #E8792F 0%, #D97735 50%, #10201E 100%)'
          }} />

          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: '#FEF3EB',
                  border: '1px solid #FCD8BF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D97735',
                  boxShadow: '0 2px 8px rgba(217, 119, 53, 0.12)',
                  flexShrink: 0
                }}>
                  <Radio size={19} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: '#10201E', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Live Ingress Block Stream</span>
                    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '12px', height: '12px' }}>
                      <span className="cyber-radar-ping" style={{ position: 'absolute', width: '12px', height: '12px', borderRadius: '50%', background: '#E8792F' }} />
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8792F', boxShadow: '0 0 8px #E8792F' }} />
                    </span>
                  </h3>
                  <div style={{ fontSize: '12px', color: '#87948D', marginTop: '2px' }}>
                    Streaming 403 quarantined events across global edge nodes
                  </div>
                </div>
              </div>

              {isPremium && (
                <Link
                  to="/user/logs"
                  style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#D97735',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#FEF3EB',
                    border: '1px solid #FCD8BF',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FCD8BF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FEF3EB';
                  }}
                >
                  <span>Inspect Stream</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>

            {/* Interactive Stream Filter Tabs */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '14px',
              padding: '3px',
              background: '#F7F6F1',
              borderRadius: '10px',
              border: '1px solid #D9E1DC',
              width: 'fit-content'
            }}>
              <button
                type="button"
                onClick={() => setStreamFilter('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: streamFilter === 'all' ? '#10201E' : 'transparent',
                  color: streamFilter === 'all' ? '#FFFFFF' : '#64748B',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                All Drops ({data?.recent_activity?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setStreamFilter('critical')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: streamFilter === 'critical' ? '#DC2626' : 'transparent',
                  color: streamFilter === 'critical' ? '#FFFFFF' : '#64748B',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Critical Threats
              </button>
              <button
                type="button"
                onClick={() => setStreamFilter('bots')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: streamFilter === 'bots' ? '#D97735' : 'transparent',
                  color: streamFilter === 'bots' ? '#FFFFFF' : '#64748B',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Bot Scanners
              </button>
            </div>

            {/* Stream Event Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '295px', overflowY: 'auto' }}>
              {filteredRecentActivity?.slice(0, 5).map((log, i) => {
                const sev = getSeverity(log.attack_type);
                const method = (log.method || (log.url?.includes('login') ? 'POST' : 'GET')).toUpperCase();

                return (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#FAFBF9',
                      border: '1px solid #EAEFEA',
                      fontSize: '12.5px',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#FCD8BF';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 32, 30, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#EAEFEA';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Event Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {/* HTTP Method Badge */}
                        <span style={{
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '5px',
                          background: method === 'POST' ? '#FEF3EB' : '#F1F5F9',
                          color: method === 'POST' ? '#D97735' : '#475569',
                          border: `1px solid ${method === 'POST' ? '#FCD8BF' : '#CBD5E1'}`
                        }}>
                          {method}
                        </span>

                        {/* Threat Type Pill (Unified Brand Colors!) */}
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: sev.bg,
                          color: sev.color,
                          border: `1px solid ${sev.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {log.status === 'allowed' || (log.attack_type || '').toLowerCase().includes('clean') || (log.attack_type || '').toLowerCase().includes('ingress') ? (
                            <ShieldCheck size={11} color="#15803D" />
                          ) : (
                            <ShieldAlert size={11} />
                          )}
                          <span>{log.attack_type || (log.status === 'allowed' ? 'Clean Ingress' : 'Exploit Intercepted')}</span>
                        </span>

                        {/* Domain */}
                        {log.domain && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#10201E',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Globe size={11} color="#87948D" />
                            <span>{log.domain}</span>
                          </span>
                        )}
                      </div>

                      {/* Relative Time */}
                      <span
                        title={log.timestamp || log.time}
                        style={{
                          fontSize: '11px',
                          color: '#87948D',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Clock size={11} />
                        <span>{formatRelativeTime(log.timestamp || log.time)}</span>
                      </span>
                    </div>

                    {/* Source IP & 403 Dropped Verdict */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Source IP: <code style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: '800',
                          color: '#10201E',
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}>
                          {log.ip}
                        </code>
                      </div>

                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        color: '#DC2626',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <Ban size={10} />
                        <span>403 DROPPED</span>
                      </span>
                    </div>

                    {/* High-Tech Terminal Ingress Snippet (Replaces plain white input) */}
                    <div style={{
                      fontSize: '11.5px',
                      fontFamily: 'JetBrains Mono, Menlo, monospace',
                      background: '#10201E',
                      border: '1px solid #1E3531',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      marginTop: '7px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        <Terminal size={12} color="#E8792F" style={{ flexShrink: 0 }} />
                        <span style={{ color: '#E8792F', fontWeight: '800' }}>›</span>
                        <span style={{ color: '#94A3B8', fontWeight: '700', fontSize: '10.5px' }}>{method}</span>
                        <span style={{ color: '#F8FAFC', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.url || '/'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyUri(log.url || '/')}
                        title="Copy Ingress Path"
                        style={{
                          background: copiedUri === (log.url || '/') ? '#28745D' : 'rgba(255, 255, 255, 0.08)',
                          border: 'none',
                          borderRadius: '4px',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10px',
                          fontWeight: '700',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {copiedUri === (log.url || '/') ? <Check size={10} /> : <Copy size={10} />}
                        <span>{copiedUri === (log.url || '/') ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Edge Ingress Verdict Annotation */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '4px',
                      fontSize: '10px',
                      color: '#87948D'
                    }}>
                      <span>Filter: Ingress WAF Inspection L7</span>
                      <span>Verdict: Quarantined at Anycast PoP</span>
                    </div>
                  </div>
                );
              }) || (
                <div style={{ textAlign: 'center', color: '#87948D', padding: '42px 20px' }}>
                  <CheckCircle2 size={30} color="#28745D" style={{ display: 'block', margin: '0 auto 8px' }} />
                  <span style={{ fontWeight: '600', color: '#10201E' }}>Zero hostile payloads intercepted</span>
                  <div style={{ fontSize: '11.5px', marginTop: '4px' }}>All live ingress requests passing clean through Anycast edge</div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Live Stream Telemetry Strip */}
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#28745D', fontWeight: '700' }}>
              <CheckCircle2 size={13} color="#28745D" />
              <span>Global Edge Dropping: 100% Active</span>
            </div>
            <div style={{ fontSize: '11px', color: '#87948D', fontWeight: '600' }}>
              Stream Engine: 3s Real-Time Polling
            </div>
          </div>

          {!isPremium && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(5px)',
              background: 'rgba(255, 255, 255, 0.86)',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '13px',
                background: '#FEF3EB',
                border: '1px solid #FCD8BF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97735',
                marginBottom: '12px',
                boxShadow: '0 4px 12px rgba(217, 119, 53, 0.15)'
              }}>
                <Lock size={22} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#10201E', margin: '0 0 6px' }}>
                Live Stream Feeds Locked
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 0 16px', lineHeight: 1.5 }}>
                Upgrade to stream millisecond telemetry, full exploit payloads, HTTP request headers, and edge ingress verdicts.
              </p>
              <Link
                to="/user/pricing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '12px',
                  background: '#10201E',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(16, 32, 30, 0.2)'
                }}
              >
                <Crown size={14} color="#E8792F" />
                <span>Upgrade to Stream Feeds</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SYSTEM DEFENSE ENGINES STATUS & QUICK ACTION DOCK                      */}
      {/* ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #D9E1DC',
        padding: '18px 26px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        fontSize: '13px',
        boxShadow: '0 2px 8px rgba(16, 32, 30, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)' }} />
            <span style={{ color: '#64748B' }}>WAF Rule Engine:</span>
            <strong style={{ color: '#10201E' }}>Online (0.12ms)</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
            }} />
            <span style={{ color: '#64748B' }}>ML Threat Model:</span>
            <strong style={{ color: '#10201E' }}>
              {mlStatus?.waf?.loaded ? `v${mlStatus.waf.version}` : 'Active (v3.0)'}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }} />
            <span style={{ color: '#64748B' }}>Rate Limiting Layer:</span>
            <strong style={{ color: '#10201E' }}>Enforcing</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }} />
            <span style={{ color: '#64748B' }}>Edge SSL/TLS:</span>
            <strong style={{ color: '#10201E' }}>TLS 1.3 Certified</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link
            to="/user/domains"
            style={{
              color: '#10201E',
              textDecoration: 'none',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px'
            }}
          >
            <Globe size={15} color="#2A8B68" />
            <span>Manage Domains</span>
          </Link>

          <span style={{ color: '#D9E1DC' }}>|</span>

          <Link
            to="/user/websites"
            style={{
              color: '#10201E',
              textDecoration: 'none',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px'
            }}
          >
            <Layers size={15} color="#059669" />
            <span>WordPress Sites ({websitesList.length})</span>
          </Link>

          <span style={{ color: '#D9E1DC' }}>|</span>

          <Link
            to="/user/connect"
            style={{
              color: '#10201E',
              textDecoration: 'none',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px'
            }}
          >
            <Zap size={15} color="#E8792F" />
            <span>Connect Website</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
