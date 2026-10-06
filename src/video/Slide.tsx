import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from 'remotion';

export interface SlideData {
  id: string;
  image: string;
  badge: string;
  headline: string;
  subtitle: string;
  stepNumber: string;
  durationInFrames: number;
}

export const SLIDES: SlideData[] = [
  {
    id: 'hero',
    image: 'demo-assets/slide-01-hero.png',
    stepNumber: '01',
    badge: 'LIVE ON VERCEL • UNIFYHUB',
    headline: 'Personal Command Station',
    subtitle: 'Consolidates all your workspaces, deadlines, and notifications into one calm bento view.',
    durationInFrames: 120, // 4s
  },
  {
    id: 'features',
    image: 'demo-assets/slide-02-features.png',
    stepNumber: '02',
    badge: 'ARCHITECTURE • CALM DESIGN',
    headline: 'Frosted Glass Serenity',
    subtitle: 'Streamlined design language with zero tab fatigue, built for students and builders.',
    durationInFrames: 120, // 4s
  },
  {
    id: 'dashboard',
    image: 'demo-assets/slide-03-dashboard.png',
    stepNumber: '03',
    badge: 'CENTRAL HUB • COMMAND VIEW',
    headline: 'Unified Day View',
    subtitle: 'Calendar events, pending code PRs, and task backlogs synthesized in real-time.',
    durationInFrames: 120, // 4s
  },
  {
    id: 'integrations',
    image: 'demo-assets/slide-04-integrations.png',
    stepNumber: '04',
    badge: 'STEP 1: INTEGRATIONS CATALOG',
    headline: 'Choose Your Ecosystems',
    subtitle: 'Head over to Integrations to connect Google, Microsoft, GitHub, Notion, and more.',
    durationInFrames: 135, // 4.5s
  },
  {
    id: 'google-select',
    image: 'demo-assets/slide-05-google-select.png',
    stepNumber: '05',
    badge: 'STEP 2: ADD GOOGLE PROVIDER',
    headline: 'Select Google Workspace',
    subtitle: 'Click "Connect Google" to securely link Gmail, Google Calendar, and Drive tasks.',
    durationInFrames: 150, // 5s
  },
  {
    id: 'google-auth',
    image: 'demo-assets/slide-06-google-connected.png',
    stepNumber: '06',
    badge: 'STEP 3: SECURE OAUTH HANDSHAKE',
    headline: 'Encrypted Token Exchange',
    subtitle: 'Read-only scopes via Supabase Edge Functions. Zero AI scraping of personal data.',
    durationInFrames: 135, // 4.5s
  },
  {
    id: 'calendar-sync',
    image: 'demo-assets/slide-07-calendar-sync.png',
    stepNumber: '07',
    badge: 'STEP 4: INSTANT STREAM SYNC',
    headline: 'Live Stream Connected',
    subtitle: 'All Google Calendar meetings and tasks automatically flow into your unified agenda.',
    durationInFrames: 120, // 4s
  },
  {
    id: 'command-palette',
    image: 'demo-assets/slide-08-command-palette.png',
    stepNumber: '08',
    badge: 'TRY LIVE: UNIFYHUBZ.VERCEL.APP',
    headline: 'Zero Tab Hopping. Total Calm.',
    subtitle: 'Experience UnifyHub in Dark Mode on desktop or mobile. Open command station now!',
    durationInFrames: 120, // 4s
  },
];

export const Slide: React.FC<{ slide: SlideData; totalSlides: number; index: number }> = ({
  slide,
  totalSlides,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const spr = spring({
    frame,
    fps,
    config: {
      damping: 18,
      stiffness: 120,
      mass: 0.8,
    },
  });

  // Slow, cinematic zoom on the UI screenshot
  const scale = interpolate(frame, [0, slide.durationInFrames], [1, 1.05], {
    extrapolateRight: 'clamp',
  });

  // Fade in and out
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(
    frame,
    [slide.durationInFrames - 12, slide.durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Caption card slide-up
  const captionY = interpolate(spr, [0, 1], [40, 0]);

  // Overall timeline progress bar percentage
  const stepPercent = ((index + 1) / totalSlides) * 100;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0c0b0a',
        opacity,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Background UI image with subtle cinematic zoom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Img
          src={staticFile(slide.image)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale})`,
            filter: 'brightness(0.92) contrast(1.04)',
          }}
        />
        {/* Subtle Dark Vignette & Command Glow overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 20%, rgba(232, 165, 75, 0.08) 0%, transparent 60%), linear-gradient(180deg, rgba(12,11,10,0.3) 0%, rgba(12,11,10,0.1) 40%, rgba(12,11,10,0.85) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Top Header Bar with Live App Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          left: 48,
          right: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(20, 18, 16, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '8px 18px',
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: '#e8a54b',
              color: '#1a140d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            U
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            UnifyHub
          </span>
          <span
            style={{
              fontSize: 11,
              color: '#a89f91',
              fontFamily: 'monospace',
              borderLeft: '1px solid rgba(255,255,255,0.15)',
              paddingLeft: 10,
            }}
          >
            https://unifyhubz.vercel.app
          </span>
        </div>

        {/* Dark Mode & Live Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(20, 18, 16, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '8px 16px',
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.08em',
              color: '#e2dbcd',
              textTransform: 'uppercase',
            }}
          >
            Dark Mode • Step {slide.stepNumber}/0{totalSlides}
          </span>
        </div>
      </div>

      {/* Dynamic Burned-in Text Caption at Bottom (Frosted Glass LinkedIn Banner) */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 48,
          right: 48,
          transform: `translateY(${captionY}px)`,
        }}
      >
        <div
          style={{
            background: 'rgba(16, 15, 14, 0.88)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(232, 165, 75, 0.35)',
            borderRadius: 24,
            padding: '24px 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 30px rgba(232, 165, 75, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(232, 165, 75, 0.15)',
                border: '1px solid rgba(232, 165, 75, 0.4)',
                borderRadius: 999,
                padding: '4px 12px',
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  letterSpacing: '0.08em',
                  color: '#e8a54b',
                }}
              >
                {slide.badge}
              </span>
            </div>

            <h2
              style={{
                margin: '2px 0 6px 0',
                fontSize: 26,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              {slide.headline}
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.45,
                color: '#c2b8a7',
                maxWidth: '900px',
              }}
            >
              {slide.subtitle}
            </p>
          </div>

          {/* Step Pill */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(232, 165, 75, 0.12)',
              border: '1px solid rgba(232, 165, 75, 0.3)',
              borderRadius: 16,
              padding: '12px 20px',
              minWidth: 80,
            }}
          >
            <span style={{ fontSize: 10, color: '#a89f91', fontFamily: 'monospace' }}>STEP</span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: '#e8a54b',
                fontFamily: 'monospace',
              }}
            >
              {slide.stepNumber}
            </span>
          </div>
        </div>

        {/* Global Walkthrough Progress Bar */}
        <div
          style={{
            marginTop: 12,
            height: 4,
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${stepPercent}%`,
              backgroundColor: '#e8a54b',
              borderRadius: 99,
              boxShadow: '0 0 10px #e8a54b',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
