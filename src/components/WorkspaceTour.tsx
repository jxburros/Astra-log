import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: string;
  /** Preferred side to show the tooltip relative to the spotlight. */
  tooltipSide: 'right' | 'left' | 'bottom' | 'top';
}

const STEPS: TourStep[] = [
  {
    target: 'terminal',
    title: 'Terminal — Ingestion',
    description:
      'Drag-and-drop a ZIP file or click the upload button. Astra/log automatically detects your start script, installs dependencies, and boots the project — streaming all output here.',
    icon: '⚡',
    tooltipSide: 'right',
  },
  {
    target: 'preview',
    title: 'Preview — Output',
    description:
      'Your running app appears instantly inside this built-in browser. Switch between Mobile, Tablet, and Desktop viewports to test responsiveness without leaving the workspace.',
    icon: '🖥️',
    tooltipSide: 'bottom',
  },
  {
    target: 'scratch',
    title: 'Scratch Pad — Private Thoughts',
    description:
      'Your personal notepad for raw ideas and planning notes. Content is strictly local — it is never sent to any AI provider. Use it freely before deciding what to share with the AI.',
    icon: '✏️',
    tooltipSide: 'left',
  },
];

const PAD = 10;

interface Props {
  onComplete: () => void;
}

interface SpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function WorkspaceTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  const current = STEPS[step];

  // Measure target element on each step change
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setSpotlight({ left: r.left, top: r.top, width: r.width, height: r.height });
      } else {
        setSpotlight(null);
      }
    };
    measure();
    // Re-measure after any layout shift
    const id = setTimeout(measure, 80);
    return () => clearTimeout(id);
  }, [step, current.target]);

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const goPrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // Compute tooltip position relative to spotlight
  const tooltipStyle = (): CSSProperties => {
    if (!spotlight) {
      // Centre of screen fallback
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' };
    }
    const gap = 18;
    const { left, top, width, height } = spotlight;
    const s = current.tooltipSide;

    if (s === 'right') {
      return {
        position: 'fixed',
        left: left + width + PAD + gap,
        top: top + height / 2,
        transform: 'translateY(-50%)',
      };
    }
    if (s === 'left') {
      return {
        position: 'fixed',
        right: window.innerWidth - (left - PAD - gap),
        top: top + height / 2,
        transform: 'translateY(-50%)',
      };
    }
    if (s === 'bottom') {
      return {
        position: 'fixed',
        top: top + height + PAD + gap,
        left: Math.min(left + width / 2, window.innerWidth - 340),
        transform: 'translateX(-50%)',
      };
    }
    // top
    return {
      position: 'fixed',
      bottom: window.innerHeight - (top - PAD - gap),
      left: left + width / 2,
      transform: 'translateX(-50%)',
    };
  };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: 'auto' }}>

      {/* SVG overlay — dims everything except the spotlight cutout */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={vw}
        height={vh}
        style={{ display: 'block' }}
      >
        <defs>
          <mask id="tour-mask">
            {/* White = dimmed */}
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            {/* Black = transparent (spotlight) */}
            {spotlight && (
              <rect
                x={spotlight.left - PAD}
                y={spotlight.top - PAD}
                width={spotlight.width + PAD * 2}
                height={spotlight.height + PAD * 2}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0"
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.72)"
          mask="url(#tour-mask)"
        />
        {/* Spotlight ring */}
        {spotlight && (
          <rect
            x={spotlight.left - PAD}
            y={spotlight.top - PAD}
            width={spotlight.width + PAD * 2}
            height={spotlight.height + PAD * 2}
            rx="10"
            fill="none"
            stroke="rgba(99,102,241,0.75)"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* Backdrop click-handler (skip-to-next) */}
      <div className="absolute inset-0" onClick={goNext} />

      {/* Tour card */}
      <div
        className="w-72 bg-zinc-900 border border-white/12 rounded-2xl shadow-2xl z-10"
        style={tooltipStyle()}
        onClick={e => e.stopPropagation()}
      >
        {/* Step header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{current.icon}</span>
            <span className="text-xs font-semibold text-white">{current.title}</span>
          </div>
          <button
            onClick={onComplete}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Close tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step body */}
        <div className="px-4 py-3">
          <p className="text-xs text-zinc-400 leading-relaxed">{current.description}</p>
        </div>

        {/* Step navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 bg-white/3 rounded-b-2xl">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-indigo-400' : 'bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={goPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
            <button
              onClick={goNext}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              {step < STEPS.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-3 h-3" />
                </>
              ) : (
                "Done"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
