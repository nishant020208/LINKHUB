import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { SLIDES, Slide } from './Slide';

export const TOTAL_DURATION_IN_FRAMES = SLIDES.reduce(
  (acc, slide) => acc + slide.durationInFrames,
  0
);

export const DemoWalkthrough: React.FC = () => {
  let accumulatedFrom = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0c0b0a' }}>
      {SLIDES.map((slide, index) => {
        const from = accumulatedFrom;
        accumulatedFrom += slide.durationInFrames;

        return (
          <Sequence
            key={slide.id}
            from={from}
            durationInFrames={slide.durationInFrames}
            name={slide.headline}
          >
            <Slide slide={slide} totalSlides={SLIDES.length} index={index} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
