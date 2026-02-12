import { Canvas } from "@react-three/fiber";
import { Blob, type VisualMode } from "./Blob";
import type { Bands } from "../audio/useAudioAnalyser";

type Props = {
  updateAudio: () => void;
  getBands: () => Bands;
  intensity: number;
  mode: VisualMode;
};

export function VisualizerCanvas({ updateAudio, getBands, intensity, mode }: Props) {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0 }}
      camera={{ position: [0, 0, 3.2], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 2, 2]} intensity={1.2} />
      <Blob updateAudio={updateAudio} getBands={getBands} intensity={intensity} mode={mode} />
    </Canvas>
  );
}
