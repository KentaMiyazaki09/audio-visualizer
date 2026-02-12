import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Bands } from "../audio/useAudioAnalyser";

export type VisualMode = "minimal" | "wire" | "neon";

type Props = {
  updateAudio: () => void;
  getBands: () => Bands;
  intensity: number; // 0..2 くらい
  mode: VisualMode;
};

export function Blob({ updateAudio, getBands, intensity, mode }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const basePositions = useRef<Float32Array | null>(null);

  const materialBase = useMemo(() => {
    if (mode === "neon") return { metalness: 0.2, roughness: 0.25 };
    return { metalness: 0.1, roughness: 0.45 };
  }, [mode]);

  useFrame((state) => {
    // ✅ refはuseFrame内で読む
    updateAudio();
    const { bass, mid, treble } = getBands();

    const b = bass * intensity;
    const m = mid * intensity;
    const t = treble * intensity;

    const mesh = meshRef.current;

    mesh.rotation.y += 0.003 + b * 0.01;
    mesh.rotation.x += 0.0015;

    mesh.scale.setScalar(1 + b * 0.35);

    // 変形（mid）
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;

    if (!basePositions.current) {
      basePositions.current = new Float32Array(pos.array as Float32Array);
    }
    const base = basePositions.current;
    const arr = pos.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3;
      const x = base[ix + 0];
      const y = base[ix + 1];
      const z = base[ix + 2];
      const len = Math.hypot(x, y, z) || 1;

      const nx = x / len,
        ny = y / len,
        nz = z / len;

      const wobble = 1 + Math.sin(time * 2 + i * 0.02) * 0.08 * m;

      arr[ix + 0] = nx * wobble;
      arr[ix + 1] = ny * wobble;
      arr[ix + 2] = nz * wobble;
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // 色/発光（treble + mode）
    const mat = mesh.material as THREE.MeshStandardMaterial;

    if (mode === "neon") {
      mat.wireframe = false;
      mat.color.setHSL(0.55 + t * 0.2, 1.0, 0.55);
      mat.emissive.setHSL(0.55 + t * 0.2, 1.0, 0.22);
      mat.emissiveIntensity = 1.2 + t * 3;
    } else if (mode === "wire") {
      mat.wireframe = true;
      mat.color.setHSL(0, 0, 0.95);
      mat.emissive.setHSL(0, 0, 0);
      mat.emissiveIntensity = 0;
    } else {
      mat.wireframe = false;
      mat.color.setHSL(0, 0, 0.95);
      mat.emissive.setHSL(0, 0, 0);
      mat.emissiveIntensity = 0;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 64]} />
      <meshStandardMaterial {...materialBase} />
    </mesh>
  );
}
