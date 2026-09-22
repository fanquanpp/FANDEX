import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { motionDuration, motionEasing } from './tokens';

interface MotionProviderProps {
  children: ReactNode;
}

const defaultTransition = {
  duration: motionDuration.normal,
  ease: motionEasing.out,
};

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <MotionConfig reducedMotion="user" transition={defaultTransition}>
      {children}
    </MotionConfig>
  );
}

export default MotionProvider;
