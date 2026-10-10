"use client";

import * as React from "react";
import { VideoSceneData } from "@/lib/validations/analytics";
import {
  Play,
  Pause,
  RotateLeft,
  ArrowRight2,
  ArrowLeft2,
  VideoPlay,
  Flash,
  DocumentDownload,
} from "iconsax-react";

interface RemotionVideoPlayerProps {
  briefing: {
    totalDurationSeconds: number;
    fps: number;
    totalFrames: number;
    scenes: VideoSceneData[];
  };
}

export function RemotionVideoPlayer({ briefing }: RemotionVideoPlayerProps) {
  const { fps = 30, totalFrames = 390, scenes = [] } = briefing;

  const [currentFrame, setCurrentFrame] = React.useState<number>(0);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState<number>(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Compute scene frame boundaries
  const sceneRanges = React.useMemo(() => {
    let acc = 0;
    return scenes.map((scene) => {
      const start = acc;
      const end = acc + scene.durationFrames;
      acc = end;
      return { scene, start, end };
    });
  }, [scenes]);

  // Determine active scene and local frame offset
  const activeSceneIndex = React.useMemo(() => {
    const idx = sceneRanges.findIndex(
      (r) => currentFrame >= r.start && currentFrame < r.end
    );
    return idx !== -1 ? idx : Math.max(0, scenes.length - 1);
  }, [currentFrame, sceneRanges, scenes.length]);

  const activeRange = sceneRanges[activeSceneIndex];
  const activeScene = activeRange ? activeRange.scene : scenes[0];
  const localSceneFrame = activeRange
    ? Math.max(0, currentFrame - activeRange.start)
    : 0;
  const sceneDuration = activeRange ? activeRange.end - activeRange.start : 90;
  const sceneProgress = Math.min(1, Math.max(0, localSceneFrame / sceneDuration));

  // RequestAnimationFrame playback loop
  React.useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const deltaMs = timestamp - lastTimestamp;
      const frameDelta = (deltaMs / 1000) * fps * playbackSpeed;

      if (frameDelta >= 0.75) {
        lastTimestamp = timestamp;
        setCurrentFrame((prev) => {
          const next = prev + Math.round(frameDelta);
          if (next >= totalFrames) {
            setIsPlaying(false);
            return totalFrames;
          }
          return next;
        });
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, fps, playbackSpeed, totalFrames]);

  // Handle Scrubbing
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(e.target.value, 10);
    setCurrentFrame(frame);
  };

  const handleNextScene = () => {
    if (activeSceneIndex < sceneRanges.length - 1) {
      setCurrentFrame(sceneRanges[activeSceneIndex + 1].start);
    }
  };

  const handlePrevScene = () => {
    if (activeSceneIndex > 0) {
      setCurrentFrame(sceneRanges[activeSceneIndex - 1].start);
    } else {
      setCurrentFrame(0);
    }
  };

  const handleReset = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  // Timecode formatting: MM:SS.ff
  const formatTimecode = (frame: number) => {
    const totalSeconds = frame / fps;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const fraction = Math.floor((totalSeconds % 1) * 100);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}.${String(fraction).padStart(2, "0")}`;
  };

  if (!scenes || scenes.length === 0) {
    return null;
  }

  // Animation values for current scene
  const entranceFactor = Math.min(1, localSceneFrame / 12);
  const remainingInScene = sceneDuration - localSceneFrame;
  const exitFactor = remainingInScene < 8 ? Math.max(0, remainingInScene / 8) : 1;
  const opacity = entranceFactor * exitFactor;
  const translateY = (1 - entranceFactor) * 10;

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-border/70 bg-card text-card-foreground overflow-hidden shadow-sm transition-colors"
    >
      {/* Top Header / Broadcast Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-brand/10 text-brand border border-brand/20">
            <VideoPlay size="14" />
            {isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-xs bg-brand" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-foreground">
                Video Summary
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-muted text-muted-foreground border border-border/50">
                REMOTION
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Visual overview of your growth and performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/60 font-mono text-xs text-foreground">
            <span className="text-brand font-semibold">
              {formatTimecode(currentFrame)}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">
              {formatTimecode(totalFrames)}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">
              [F{currentFrame}/{totalFrames}]
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPlaybackSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
            className="px-2 py-1 rounded text-[11px] font-mono bg-background hover:bg-accent border border-border/60 text-foreground transition"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>

      {/* Cinematic Viewport Stage */}
      <div className="relative w-full aspect-[21/9] sm:aspect-[16/7] md:aspect-[16/6.5] bg-gradient-to-br from-card via-muted/20 to-card flex items-center justify-center p-6 sm:p-10 select-none overflow-hidden">
        {/* Subtle Ambient Glows matching brand colors */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Dynamic Scene Content */}
        {activeScene && (
          <div
            className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center transition-all duration-75"
            style={{
              opacity,
              transform: `translateY(${translateY}px) scale(${0.98 + 0.02 * entranceFactor})`,
            }}
          >
            {/* Scene Badge */}
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-medium uppercase bg-background text-foreground border border-border/60">
                Scene {activeSceneIndex + 1} of {scenes.length}
              </span>
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono font-medium uppercase bg-muted/60 text-muted-foreground border border-border/50">
                {activeScene.evidenceBadge}
              </span>
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-2 max-w-2xl">
              {activeScene.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-5 max-w-xl line-clamp-2">
              {activeScene.subtitle}
            </p>

            {/* Large Highlight Callout */}
            <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl bg-card border border-border/70 shadow-sm mb-4 min-w-[220px] sm:min-w-[280px]">
              <div className="text-2xl sm:text-4xl font-extrabold font-mono tracking-tight text-brand">
                {activeScene.highlightValue}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mt-1">
                {activeScene.highlightLabel}
              </div>
            </div>

            {/* Tactical Insight Footer */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground max-w-2xl px-4 py-2 rounded-lg bg-muted/40 border border-border/40">
              <Flash size="14" className="text-amber-500 shrink-0" />
              <span className="italic text-muted-foreground">{activeScene.insight}</span>
            </div>
          </div>
        )}

        {/* Scene progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-border/40">
          <div
            className="h-full bg-brand transition-all duration-75"
            style={{ width: `${(currentFrame / totalFrames) * 100}%` }}
          />
        </div>
      </div>

      {/* Scrub Bar with Scene Markers */}
      <div className="px-5 pt-3 pb-2 bg-muted/15 border-t border-border/50">
        <div className="relative w-full flex items-center group">
          <input
            type="range"
            min={0}
            max={totalFrames}
            value={currentFrame}
            onChange={handleScrub}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-brand focus:outline-hidden z-10"
          />
          {/* Segment Tick Indicators */}
          <div className="absolute inset-x-0 h-2 flex justify-between pointer-events-none px-1">
            {sceneRanges.map((range, i) => (
              <div
                key={i}
                className="w-0.5 h-2 bg-border-strong/70"
                style={{
                  position: "absolute",
                  left: `${(range.start / totalFrames) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Scene Chapter Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {scenes.map((scene, idx) => {
            const isActive = idx === activeSceneIndex;
            const range = sceneRanges[idx];
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => {
                  if (range) setCurrentFrame(range.start);
                }}
                className={`flex flex-col text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${
                  isActive
                    ? "bg-card border-brand/60 text-foreground shadow-2xs"
                    : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    CH 0{idx + 1}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-xs bg-brand" />
                  )}
                </div>
                <span className="font-medium truncate text-[11px] mt-0.5">
                  {scene.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Video Control Ribbon */}
      <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t border-border/50">
        <div className="flex items-center gap-2">
          {/* Prev Scene */}
          <button
            type="button"
            onClick={handlePrevScene}
            disabled={activeSceneIndex === 0 && currentFrame === 0}
            className="p-1.5 rounded-lg border border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition"
            title="Previous Chapter"
          >
            <ArrowLeft2 size="15" />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={() => {
              if (currentFrame >= totalFrames) {
                setCurrentFrame(0);
              }
              setIsPlaying((p) => !p);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-xs bg-brand hover:opacity-90 text-brand-foreground shadow-xs transition"
          >
            {isPlaying ? (
              <>
                <Pause size="14" variant="Bold" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size="14" variant="Bold" />
                <span>Play Video</span>
              </>
            )}
          </button>

          {/* Next Scene */}
          <button
            type="button"
            onClick={handleNextScene}
            disabled={activeSceneIndex === scenes.length - 1}
            className="p-1.5 rounded-lg border border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition"
            title="Next Chapter"
          >
            <ArrowRight2 size="15" />
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-border/50 bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition"
            title="Replay from Beginning"
          >
            <RotateLeft size="15" />
          </button>
        </div>

        {/* Right Info */}
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <button
            type="button"
            onClick={() => {
              window.print();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background hover:bg-accent border border-border/60 text-foreground text-xs transition"
          >
            <DocumentDownload size="14" />
            <span className="hidden sm:inline">Print Summary</span>
          </button>
        </div>
      </div>
    </div>
  );
}
