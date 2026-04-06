import React from 'react';
import {Composition} from 'remotion';
import {IntroVideo} from './IntroVideo';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="IntroVideo"
        component={IntroVideo}
        durationInFrames={1320} // 22 secondes à 60fps
        fps={60}
        width={1080}
        height={1920}
      />
    </>
  );
};
