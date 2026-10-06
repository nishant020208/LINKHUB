import React from 'react';
import { Composition } from 'remotion';
import { DemoWalkthrough, TOTAL_DURATION_IN_FRAMES } from './DemoWalkthrough';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="UnifyHubWalkthrough"
        component={DemoWalkthrough}
        durationInFrames={TOTAL_DURATION_IN_FRAMES} // 1035 frames @ 30fps = 34.5 seconds
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
