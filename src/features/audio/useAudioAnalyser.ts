/** ここでやっていること */
// <audio>（HTMLAudioElement）
//    ↓ createMediaElementSource
// MediaElementSourceNode
//    ↓
// GainNode（音量）
//    ↓
// AnalyserNode（周波数解析）
//    ↓
// destination（スピーカー）

/**
 * FFT（高速フーリエ変換）
 * ビジュアライザでは「どの音域が強いか？」が欲しい
 * 周波数ごとの強さ（スペクトラム）に変換する
 */

/**
 * band
 * FFTは最終的に2000本の配列にまとめられるが、細かすぎるので３つの値にまとめる。
 * bass, mid, trebleの３つの低〜高音域。
 * “スペクトラムのこの範囲の平均的な強さ”を表す簡易指標。
 */

import { useCallback, useMemo, useRef } from "react";

export type Bands = { bass: number; mid: number; treble: number };

/* 安定させる */
function avg(arr: Uint8Array, from: number, to: number) {
  let sum = 0;
  const end = Math.min(arr.length, to);
  for (let i = from; i < end; i++) sum += arr[i];
  return sum / Math.max(1, end - from);
}

/* 激しめ */
function peak(arr: Uint8Array, from: number, to: number) {
  let m = 0;
  const end = Math.min(arr.length, to);
  for (let i = from; i < end; i++) if (arr[i] > m) m = arr[i];
  return m;
}

export function useAudioAnalyser() {
  /*
   * オーディオの実体（audioタグと紐付ける）
   * ここを起点にWebAudioグラフを作成する
   */
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  /**
   * WebAudioのノード、毎フレーム更新したい値
   * useStateで保持すると、再レンダーなど誤作動の元になるためuseRefで管理
   */
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const bandsRef = useRef<Bands>({ bass: 0, mid: 0, treble: 0 });

  /**
   * 初期化
   */
  const ensure = useCallback(() => {
    if (!audioElRef.current) throw new Error("audio element missing");

     // 二重実行を防ぐ
    if (ctxRef.current) return;

    const ctx = new AudioContext();

    // 音声の時間と周波数データを公開し、データの可視化を行う
    const analyser = ctx.createAnalyser();

    const gain = ctx.createGain();

    // <audio> を WebAudioに取り込む
    const source = ctx.createMediaElementSource(audioElRef.current);

    source.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    ctxRef.current = ctx;
    analyserRef.current = analyser;
    gainRef.current = gain;
    freqRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, []);

  /* 曲の差し替え */
  const setSrc = useCallback((src: string) => {
    if (!audioElRef.current) return;
    audioElRef.current.src = src;
    audioElRef.current.load();
  }, []);

  /* play、pause：再生制御 */
  const play = useCallback(async () => {
    ensure();
    if (!ctxRef.current || !audioElRef.current) return;

    // ブラウザはユーザー操作なしで音を鳴らすのを制限するので、AudioContextがsuspended（一時停止）になりがち。ボタンクリックの中で resume(再開)させる。
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
    await audioElRef.current.play();
  }, [ensure]);

  const pause = useCallback(() => {
    audioElRef.current?.pause();
  }, []);

  /* 音量調整 */
  const setVolume = useCallback(
    (v: number) => {
      ensure();
      if (gainRef.current) gainRef.current.gain.value = v;
    },
    [ensure]
  );

  /** 毎フレーム呼ばれる想定（useFrame内） */
  const update = useCallback(() => {
    const analyser = analyserRef.current;
    
    const freq = freqRef.current;
    if (!analyser || !freq) return;

    analyser.getByteFrequencyData(freq);

    // 帯域
    const bass = peak(freq, 2, 10) / 255;
    const mid = peak(freq, 10, 60) / 255;
    const treble = peak(freq, 60, 200) / 255;

    const prev = bandsRef.current;

    const smooth = (p: number, n: number, a: number, r: number) => {
      const k = n > p ? a : r;
      return p + (n - p) * k;
    };

    bandsRef.current = {
      bass: smooth(prev.bass, bass, 0.28, 0.05),
      mid: smooth(prev.mid, mid, 0.22, 0.04),
      treble: smooth(prev.treble, treble, 0.14, 0.02), // ←色は特にゆっくり
    };
  }, []);

  /**
   * 最新の band 値を返す
   * useFrame内でだけ呼ぶ想定（render中に呼ばない）
   */
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
