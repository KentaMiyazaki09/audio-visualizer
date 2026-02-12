/**
 * ・毎フレーム音のbandを取って、メッシュを変形＆色変化させる
 * ・音（bass/mid/treble） → 3Dオブジェクトの見た目（回転/スケール/形/色）に変換する
 */

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Bands } from "../audio/useAudioAnalyser";

export type VisualMode = "minimal" | "wire" | "neon";

type Props = {
  updateAudio: () => void; // FFT→bandsRef更新（useAudioAnalyserの update）
  getBands: () => Bands; // 最新の bass/mid/treble を取る
  intensity: number; // 反応の強さ（UIからの入力)
  mode: VisualMode; // 見た目のモード（minimal/wire/neon）
};

export function Blob({ updateAudio, getBands, intensity, mode }: Props) {
  // メッシュの実体
  const meshRef = useRef<THREE.Mesh>(null!);

  // “元の形”を保持する用、これがないと、毎フレームの変形が累積して崩壊しがち
  const basePositions = useRef<Float32Array | null>(null);

  // 初期状態を作る
  // mode が変わったときだけ materialのベース値を作り直す
  const materialBase = useMemo(() => {
    if (mode === "neon") return { metalness: 0.2, roughness: 0.25 };
    return { metalness: 0.1, roughness: 0.45 };
  }, [mode]);

  /*
   * useFrameを使用して毎フレーム動くループ処理を実行
   */
  useFrame((state) => {
    // band更新
    updateAudio();

    // 最新値を取得
    const { bass, mid, treble } = getBands();

    const b = bass * intensity;
    const m = mid * intensity;
    const t = treble * intensity;

    const mesh = meshRef.current;

    /*
     * 回転とスケール（bassを利用）
     */
    mesh.rotation.y += 0.003 + b * 0.01;
    mesh.rotation.x += 0.0015;
    mesh.scale.setScalar(1 + b * 0.35);

    /*
     * 頂点変形（midを利用）
     */
    // geometryのposition属性（頂点配列）を取る
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;

    if (!basePositions.current) {
      // 初回だけ元の頂点位置を保存する
      basePositions.current = new Float32Array(pos.array as Float32Array);
    }
    // 各頂点を “外側方向（法線っぽい方向）” に押し引きして波打たせる
    const base = basePositions.current;
    const arr = pos.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3;

      // 元の頂点位置
      const x = base[ix + 0];
      const y = base[ix + 1];
      const z = base[ix + 2];

      // 原点からの距離
      const len = Math.hypot(x, y, z) || 1;

      // 外側方向の単位ベクトル
      const nx = x / len,
        ny = y / len,
        nz = z / len;

      // 外側方向にちょっと押し出したり戻したりする
      const wobble = 1 + Math.sin(time * 2 + i * 0.02) * 0.08 * m;

      arr[ix + 0] = nx * wobble;
      arr[ix + 1] = ny * wobble;
      arr[ix + 2] = nz * wobble;
    }

    // 頂点位置の変更をGPUに伝える
    pos.needsUpdate = true;
    // ライティングを正しく変更する（処理重め）
    geo.computeVertexNormals();

    /*
     * 色/発光（treble + mode）
     */
    const mat = mesh.material as THREE.MeshStandardMaterial;

    // HSL で色相をゆらす（trebleで変化）
    // neonだけ emissive（自己発光）を入れる
    // wireは wireframe=true で線表示
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

  /*
   * meshを更新してCanvasを描画
   * icosahedronGeometry、球体、detail=64で頂点は多い（変形が滑らかになるが負荷）
   * meshStandardMaterial ライトに反応する普通の材質
   */
  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 64]} />
      <meshStandardMaterial {...materialBase} />
    </mesh>
  );
}
