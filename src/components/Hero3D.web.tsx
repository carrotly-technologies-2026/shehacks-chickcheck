import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RibbonFallback } from './RibbonFallback';

/*
 * Brand hero: the breast-cancer awareness ribbon as a satin strip, modelled procedurally
 * (no assets), lit by a generated studio environment, with drifting dust particles.
 */

const PTS: [number, number, number][] = [
  [-0.6, -1.25, 0.1], [-0.42, -0.8, 0.08], [-0.18, -0.32, 0.05], [0, -0.02, 0.1], [0.22, 0.32, 0.06],
  [0.36, 0.7, 0], [0.3, 1.02, -0.04], [0, 1.18, -0.06], [-0.3, 1.02, -0.04], [-0.36, 0.7, 0],
  [-0.22, 0.32, -0.04], [0, -0.02, -0.1], [0.18, -0.32, -0.06], [0.42, -0.8, -0.02], [0.6, -1.25, 0.02],
];

function ribbonGeometry(width = 0.27, rows = 420) {
  const curve = new THREE.CatmullRomCurve3(PTS.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const Z = new THREE.Vector3(0, 0, 1);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  // each edge is sampled with a small parameter offset: the tails come out cut on the bias
  const bias = 0.018;
  const edge = (t: number, s: 1 | -1) => {
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const side = new THREE.Vector3().crossVectors(tan, Z).normalize();
    side.applyAxisAngle(tan, 0.42 * Math.sin(t * Math.PI * 2.2));
    return p.addScaledVector(side, (s * width) / 2);
  };
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    const a = edge(u * (1 - bias), 1);
    const b = edge(bias + u * (1 - bias), -1);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uv.push(0, u, 1, u);
    if (i < rows) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function softDot(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Hero3D({ size }: { size: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.75;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 0, 7.4);

    const key = new THREE.DirectionalLight('#fff1e6', 2.4);
    key.position.set(3, 4, 5);
    const fill = new THREE.DirectionalLight('#ffc9d6', 1.1);
    fill.position.set(-4, -1, 3);
    const rim = new THREE.DirectionalLight('#ffffff', 1.6);
    rim.position.set(0, 3, -4);
    scene.add(key, fill, rim);

    const glowTex = softDot('rgba(255,214,224,0.55)', 'rgba(255,214,224,0)');
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 4.6),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }),
    );
    glow.position.z = -1.2;
    scene.add(glow);

    const geo = ribbonGeometry();
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#E59EB1', roughness: 0.36, metalness: 0, sheen: 1, sheenRoughness: 0.32,
      sheenColor: new THREE.Color('#FFE3EA'), clearcoat: 0.35, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
    });
    const ribbon = new THREE.Mesh(geo, mat);
    const group = new THREE.Group();
    group.add(ribbon);
    scene.add(group);

    const N = 90;
    const dust = new Float32Array(N * 3);
    const speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      dust[i * 3] = (Math.random() - 0.5) * 4.2;
      dust[i * 3 + 1] = (Math.random() - 0.5) * 4.2;
      dust[i * 3 + 2] = -1.4 + Math.random() * 2;
      speed[i] = 0.05 + Math.random() * 0.12;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    const dotTex = softDot('rgba(255,240,235,1)', 'rgba(255,240,235,0)');
    const dustMat = new THREE.PointsMaterial({ size: 0.07, map: dotTex, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
    scene.add(new THREE.Points(dustGeo, dustMat));

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      const intro = 1 - Math.pow(1 - Math.min(1, t / 1.6), 3);
      group.scale.setScalar(0.86 + 0.14 * intro);
      group.rotation.y = Math.sin(t * 0.45) * 0.5 + pointer.x * 0.25 + (1 - intro) * 0.9;
      group.rotation.x = Math.sin(t * 0.3) * 0.06 + pointer.y * 0.12;
      group.rotation.z = Math.sin(t * 0.37) * 0.03;
      group.position.y = Math.sin(t * 0.9) * 0.05;
      const pos = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < N; i++) {
        let y = pos.getY(i) + speed[i] * 0.012;
        if (y > 2.1) y = -2.1;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.6 + i) * 0.0008);
      }
      pos.needsUpdate = true;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      [geo, dustGeo].forEach((g) => g.dispose());
      [mat, dustMat].forEach((m) => m.dispose());
      [glowTex, dotTex, env].forEach((x) => x.dispose());
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [size]);

  if (failed) return <RibbonFallback size={size} />;
  return <div ref={host} style={{ width: size, height: size }} />;
}
