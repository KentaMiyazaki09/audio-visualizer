import { useCallback, useMemo, useRef } from "react";

export type Bands = { bass: number; mid: number; treble: number };

function avg(arr: Uint8Array, from: number, to: number) {
  let sum = 0;
  const end = Math.min(arr.length, to);
  for (let i = from; i < end; i++) sum += arr[i];
  return sum / Math.max(1, end - from);
}

export function useAudioAnalyser() {
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const bandsRef = useRef<Bands>({ bass: 0, mid: 0, treble: 0 });

  const ensure = useCallback(() => {
    if (!audioElRef.current) throw new Error("audio element missing");

    if (ctxRef.current) return;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    const gain = ctx.createGain();
    const source = ctx.createMediaElementSource(audioElRef.current);

    source.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    ctxRef.current = ctx;
    analyserRef.current = analyser;
    gainRef.current = gain;
    freqRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, []);

  const setSrc = useCallback((src: string) => {
    if (!audioElRef.current) return;
    audioElRef.current.src = src;
    audioElRef.current.load();
  }, []);

  const play = useCallback(async () => {
    ensure();
    if (!ctxRef.current || !audioElRef.current) return;

    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
    await audioElRef.current.play();
  }, [ensure]);

  const pause = useCallback(() => {
    audioElRef.current?.pause();
  }, []);

  const setVolume = useCallback(
    (v: number) => {
      ensure();
      if (gainRef.current) gainRef.current.gain.value = v; // 0..1
    },
    [ensure]
  );

  /** 毎フレーム呼ばれる想定（useFrame内） */
  const update = useCallback(() => {
    const analyser = analyserRef.current;
    
    const freq = freqRef.current;
    if (!analyser || !freq) return;

    analyser.getByteFrequencyData(freq);

    // ざっくり帯域（好みで調整）
    const bass = avg(freq, 0, 20) / 255;
    const mid = avg(freq, 20, 80) / 255;
    const treble = avg(freq, 80, 180) / 255;

    bandsRef.current = { bass, mid, treble };
  }, []);

  /** useFrame内でだけ呼ぶ想定（render中に呼ばない） */
  const getBands = useCallback((): Bands => bandsRef.current, []);

  return useMemo(
    () => ({
      audioElRef,
      setSrc,
      play,
      pause,
      setVolume,
      update,
      getBands,
    }),
    [getBands, pause, play, setSrc, setVolume, update]
  );
}
