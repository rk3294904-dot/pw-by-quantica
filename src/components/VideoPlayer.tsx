import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { MediaPlayer } from 'dashjs';
import type { MediaPlayerClass } from 'dashjs';
import type { RequestInterceptor } from '@svta/cml-request';
import type { VideoApiResponse } from '@/types';
import { fetchVideo } from '@/services/api';

interface Props {
  batchId: string;
  lectureId: string;
  subjectId: string;
  title: string;
  onBack: () => void;
  initialPosition: number;
  initiallyCompleted: boolean;
  saveEnabled: boolean;
  saveError: string | null;
  onProgress: (position: number, duration: number, completed: boolean) => void;
}

function hexToBase64Url(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayer({
  batchId,
  lectureId,
  subjectId,
  title,
  onBack,
  initialPosition,
  initiallyCompleted,
  saveEnabled,
  saveError,
  onProgress,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<MediaPlayerClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [speed, setSpeed] = useState(1);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const completedRef = useRef(initiallyCompleted);
  const progressCallbackRef = useRef(onProgress);
  const resumePositionRef = useRef(initialPosition);

  useEffect(() => {
    progressCallbackRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !saveEnabled) return;
    let restored = resumePositionRef.current <= 0;
    let hasPlayed = false;
    let lastSaved = Date.now();

    const restorePosition = () => {
      if (restored || !Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Math.min(resumePositionRef.current, Math.max(0, video.duration - 1));
      setCurrentTime(video.currentTime);
      restored = true;
    };
    const save = () => {
      if (!hasPlayed || !restored || !Number.isFinite(video.duration) || video.duration <= 0) return;
      lastSaved = Date.now();
      progressCallbackRef.current(video.currentTime, video.duration, completedRef.current);
    };
    const onPlaying = () => { hasPlayed = true; restorePosition(); };
    const onTimeUpdate = () => {
      restorePosition();
      if (!video.paused && Date.now() - lastSaved >= 15000) save();
    };
    const onEnded = () => {
      completedRef.current = true;
      setCompleted(true);
      save();
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') save(); };
    video.addEventListener('loadedmetadata', restorePosition);
    video.addEventListener('loadeddata', restorePosition);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('pause', save);
    video.addEventListener('ended', onEnded);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      save();
      video.removeEventListener('loadedmetadata', restorePosition);
      video.removeEventListener('loadeddata', restorePosition);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('pause', save);
      video.removeEventListener('ended', onEnded);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [saveEnabled, batchId, lectureId, subjectId]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (playingRef.current) setShowControls(false);
    }, 3000);
  }, []);

  const playingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let loadingTimer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setError(null);
    setPlaying(false);
    playingRef.current = false;

    async function init() {
      try {
        const res: VideoApiResponse = await fetchVideo(
          batchId,
          lectureId,
          subjectId,
          controller.signal
        );
        if (cancelled) return;

        if (!res.success) {
          setError('Failed to fetch video from server.');
          setLoading(false);
          return;
        }

        const streamUrl = res.url || res.dashurl;
        if (!streamUrl) {
          setError('No video URL available for this lecture.');
          setLoading(false);
          return;
        }

        const manifestUrlObj = new URL(streamUrl);
        const signingParams = manifestUrlObj.search;

        const video = videoRef.current;
        if (!video) return;

        const player = MediaPlayer().create();
        playerRef.current = player;
        player.updateSettings({
          debug: { logLevel: 0 },
          streaming: { capabilities: { useMediaCapabilitiesApi: false } },
        });

        const keyEntries = Object.keys(res.keys ?? {});
        if (keyEntries.length > 0) {
          const clearkeys: Record<string, string> = {};
          for (const kid of keyEntries) {
            clearkeys[hexToBase64Url(kid)] = hexToBase64Url(res.keys[kid]);
          }
          player.setProtectionData({
            'org.w3.clearkey': {
              clearkeys,
            },
          });
        }

        if (signingParams) {
          const interceptor: RequestInterceptor = (request) => {
            if (request.url) {
              const requestUrl = new URL(request.url, streamUrl);
              const hostname = requestUrl.hostname;
              if (requestUrl.origin === manifestUrlObj.origin || hostname === 'examcrushers.in'
                || hostname.endsWith('.examcrushers.in') || hostname.endsWith('.cloudfront.net')) {
                manifestUrlObj.searchParams.forEach((value, name) => {
                  if (!requestUrl.searchParams.has(name)) requestUrl.searchParams.append(name, value);
                });
                request.url = requestUrl.href;
              }
            }
            return Promise.resolve(request);
          };
          player.addRequestInterceptor(interceptor);
        }

        player.on(MediaPlayer.events.ERROR, (e) => {
          if (cancelled) return;
          const err = e as { error?: { code?: number; message?: string } | string };
          const msg = typeof err.error === 'object' && err.error?.code === 32
            ? 'No playable audio or video tracks were found. Retry to refresh the stream. If this continues, the lecture source or browser may not support this video.'
            : 'Video playback failed. Retry to refresh the stream, or try another supported browser.';
          setError(msg);
          setLoading(false);
        });

        player.on(MediaPlayer.events.PLAYBACK_PLAYING, () => {
          if (cancelled) return;
          setLoading(false);
          setPlaying(true);
          playingRef.current = true;
        });

        player.on(MediaPlayer.events.PLAYBACK_PAUSED, () => {
          if (cancelled) return;
          setPlaying(false);
          playingRef.current = false;
          setShowControls(true);
        });

        player.on(MediaPlayer.events.PLAYBACK_LOADED_DATA, () => {
          if (cancelled) return;
          setLoading(false);
        });

        player.on(MediaPlayer.events.PLAYBACK_TIME_UPDATED, () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v) {
            setCurrentTime(v.currentTime);
            if (v.buffered.length > 0) {
              setBuffered(v.buffered.end(v.buffered.length - 1));
            }
          }
        });

        player.on(MediaPlayer.events.PLAYBACK_METADATA_LOADED, () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v) setDuration(v.duration);
        });

        player.on(MediaPlayer.events.STREAM_INITIALIZED, () => {
          if (cancelled) return;
          setLoading(false);
          const v = videoRef.current;
          if (v) setDuration(v.duration);
        });

        player.initialize(video, streamUrl, true);

        loadingTimer = setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, 8000);
      } catch {
        if (cancelled) return;
        setError('Unable to load this video. Please retry.');
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      controller.abort();
      if (loadingTimer) clearTimeout(loadingTimer);
      if (playerRef.current) {
        playerRef.current.reset();
        playerRef.current = null;
      }
    };
  }, [batchId, lectureId, subjectId, retryAttempt]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;

      if (e.key === 'Escape') {
        if (fullscreen) {
          document.exitFullscreen();
        } else {
          onBack();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (v.paused) v.play();
        else v.pause();
      } else if (e.key === 'ArrowLeft') {
        v.currentTime = Math.max(0, v.currentTime - 10);
      } else if (e.key === 'ArrowRight') {
        v.currentTime = Math.min(v.duration, v.currentTime + 10);
      } else if (e.key === 'f') {
        toggleFullscreen();
      } else if (e.key === 'm') {
        v.muted = !v.muted;
        setMuted(v.muted);
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [fullscreen, onBack]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = parseFloat(e.target.value);
    v.volume = vol;
    v.muted = vol === 0;
    setVolume(vol);
    setMuted(vol === 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const time = parseFloat(e.target.value);
    v.currentTime = time;
    setCurrentTime(time);
  };

  const skip = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
  };

  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-white transition hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium hidden sm:inline">Back</span>
        </button>
        <h3 className="flex-1 text-sm font-medium text-white line-clamp-1">
          {title}
        </h3>
        <button type="button" disabled={!saveEnabled || loading || duration <= 0}
          aria-pressed={completed}
          onClick={() => {
            const video = videoRef.current;
            if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
            const nextCompleted = !completedRef.current;
            completedRef.current = nextCompleted;
            setCompleted(nextCompleted);
            progressCallbackRef.current(video.currentTime, video.duration, nextCompleted);
          }}
          className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/10 disabled:opacity-40 ${completed ? 'text-emerald-300' : 'text-white'}`}>
          <CheckCircle2 className="h-4 w-4" />
          <span>{completed ? 'Completed' : 'Mark complete'}</span>
        </button>
      </div>

      {(saveError || !saveEnabled) && (
        <div role="status" className="absolute left-4 right-4 top-16 z-40 rounded-lg bg-slate-900/95 px-3 py-2 text-xs text-amber-200">
          {saveError || 'Progress saving is unavailable. Return to the catalog and retry loading your library.'}
        </div>
      )}

      {/* Video container */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center bg-black"
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => {
          if (playingRef.current) setShowControls(false);
        }}
        onClick={() => {
          const v = videoRef.current;
          if (v && !loading && !error) togglePlay();
          showControlsTemporarily();
        }}
      >
        <video
          ref={videoRef}
          className="h-full w-full"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Center play/pause button */}
        {!loading && !error && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
              showControlsTemporarily();
            }}
            className="absolute z-20 flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-all hover:bg-black/60 active:scale-90 sm:h-20 sm:w-20"
            style={{ opacity: playing && !showControls ? 0 : 1 }}
          >
            {playing ? (
              <Pause className="h-8 w-8 text-white sm:h-10 sm:w-10" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1 sm:h-10 sm:w-10" />
            )}
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <p className="mt-4 text-sm text-slate-300">Loading video...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="mt-4 text-sm text-slate-300 max-w-sm text-center">
              {error}
            </p>
            <button
              onClick={() => setRetryAttempt((current) => current + 1)}
              className="mt-6 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              Retry Video
            </button>
            <button
              onClick={onBack}
              className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Bottom controls */}
        {!loading && !error && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 to-transparent px-3 pb-3 pt-12 transition-opacity duration-300 sm:px-4 sm:pb-4 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div className="relative mb-2">
              <div className="absolute inset-0 h-1.5 rounded-full bg-white/20" />
              <div
                className="absolute h-1.5 rounded-full bg-white/30"
                style={{ width: `${bufferedPct}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="relative z-10 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${progressPct}%, transparent ${progressPct}%)`,
                }}
              />
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={togglePlay}
                className="text-white transition hover:text-blue-400 active:scale-90"
              >
                {playing ? (
                  <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </button>

              <button
                onClick={() => skip(-10)}
                className="text-white/80 transition hover:text-white active:scale-90"
              >
                <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <button
                onClick={() => skip(10)}
                className="text-white/80 transition hover:text-white active:scale-90"
              >
                <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white transition hover:text-blue-400 active:scale-90"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="hidden w-16 cursor-pointer appearance-none rounded-full bg-white/20 sm:block [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 sm:w-20"
                />
              </div>

              {/* Time */}
              <div className="text-xs font-medium text-white/90 tabular-nums sm:text-sm">
                {formatTime(currentTime)} <span className="text-white/50">/ {formatTime(duration)}</span>
              </div>

              <div className="flex-1" />

              {/* Speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-white/80 transition hover:text-white hover:bg-white/10 sm:text-sm"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">{speed}x</span>
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 overflow-hidden rounded-lg bg-slate-800/95 shadow-xl backdrop-blur-md">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`block w-full px-4 py-2 text-left text-xs transition hover:bg-white/10 sm:text-sm ${
                          speed === s ? 'text-blue-400 font-semibold' : 'text-white/80'
                        }`}
                      >
                        {s}x{s === 1 ? ' (Normal)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white transition hover:text-blue-400 active:scale-90"
              >
                {fullscreen ? (
                  <Minimize className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Maximize className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
