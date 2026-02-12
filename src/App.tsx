import { useEffect, useState } from "react";
import { Button, Group, Slider, SegmentedControl, Paper, Text, Select } from "@mantine/core";
import { useAudioAnalyser } from "./features/audio/useAudioAnalyser";
import { VisualizerCanvas } from "./features/visual/VisualizerCanvas";
import type { VisualMode } from "./features/visual/Blob";

/**
 * サンプル楽曲の一覧
 */
const tracks = [
  { label: "シャイニングスター（魔王魂）", value: "/mp3/sample.mp3" },
  { label: "桜日和（魔王魂）", value: "/mp3/sample2.mp3" },
]

export function App() {
  /**
   * HTMLAudioElementで音を鳴らしつつ、
   * WebAudioのAnalyserでFFT（周波数データ）を取る」* ためのフック
   */
  const audio = useAudioAnalyser();

  /**
   * 全体の状態管理
   */
  const [isPlaying, setIsPlaying] = useState(false); // 再生ON/OFF
  const [intensity, setIntensity] = useState(1.0); // ビジュアル強度
  const [volume, setVolume] = useState(0.8); // 音量
  const [mode, setMode] = useState<VisualMode>("neon"); // 表示テーマ

  const [trackSrc, setTrackSrc] = useState(tracks[0].value)

  /**
   * 楽曲のセットを管理
   */
  useEffect(() => {
    // srcを差し替え
    audio.setSrc(trackSrc);

    // 再生位置をリセット
    const audioEl = audio.audioElRef.current;
    if (!audioEl) return;
    audioEl.currentTime = 0;
  }, [audio, trackSrc]);

  /**
   * audioのstart/pauseの切り替え
   */
  useEffect(() => {
    const audioEl = audio.audioElRef.current;
    if (!audioEl) return;

    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audioEl.addEventListener("ended", onEnded);
    audioEl.addEventListener("play", onPlay);
    audioEl.addEventListener("pause", onPause);
    
    return () => {
      audioEl.removeEventListener("ended", onEnded);
      audioEl.removeEventListener("play", onPlay);
      audioEl.removeEventListener("pause", onPause);
    }
  }, [audio.audioElRef])

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>

      {/* 背景WebGL */ }
      <VisualizerCanvas
        updateAudio={audio.update}
        getBands={audio.getBands}
        intensity={intensity}
        mode={mode}
      />

      {/* オーディオ */}
      <audio ref={audio.audioElRef} />

      {/* UI */}
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
        <Group justify="space-between" align="end">
          <Paper withBorder p="md" radius="md" style={{ backdropFilter: "blur(8px)", background: "rgba(16,18,24,0.65)" }}>
            <Group gap="md">
              <Button
                onClick={async () => {
                  const el = audio.audioElRef.current;
                  if (!el) return;

                  if (el.paused) {
                    await audio.play();
                    audio.setVolume(volume);
                  } else {
                    audio.pause();
                  }
                }}
              >
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Text size="sm" c="dimmed">
                {mode.toUpperCase()}
              </Text>
            </Group>

            <Select
              label="Track"
              data={tracks}
              value={trackSrc}
              onChange={(v) => {
                if (!v) return;
                setTrackSrc(v);
                audio.pause();
                setIsPlaying(false);
              }}
              styles={{
                dropdown: { backgroundColor: "#fff" },
                option: { color: "#111" },
                label: { color: "#fff" },
              }}
            />
          </Paper>

          <Paper withBorder p="md" radius="md" style={{ width: 320, backdropFilter: "blur(8px)", background: "rgba(16,18,24,0.65)" }}>
            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(v) => setMode(v as VisualMode)}
              data={[
                { label: "Neon", value: "neon" },
                { label: "Minimal", value: "minimal" },
                { label: "Wire", value: "wire" },
              ]}
            />
            <div style={{ marginTop: 14 }}>
              <Slider
                label="Volume"
                value={Math.round(volume * 100)}
                onChange={(v) => {
                  const nv = v / 100;
                  setVolume(nv);
                  audio.setVolume(nv);
                }}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <Slider
                label="Intensity"
                value={Math.round(intensity * 50)}
                onChange={(v) => setIntensity(v / 50)}
              />
            </div>
          </Paper>
        </Group>
      </div>
    </div>
  );
}
