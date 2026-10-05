import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DesktopBentoCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  hasRecentSync?: boolean;
  accountDotColor?: string;
  title?: string;
}

export const DesktopBentoCard: React.FC<DesktopBentoCardProps> = ({
  children,
  className,
  onClick,
  interactive = false,
  hasRecentSync = false,
  accountDotColor,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

  // Mouse tilt physics coordinates
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Damped spring physics for smooth, calm tilt
  const springConfig = { stiffness: 400, damping: 28 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Transform to subtle rotation angles (max +/- 2.5 degrees)
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [2.5, -2.5]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-2.5, 2.5]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !interactive) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate normalized position from -0.5 (left/top) to +0.5 (right/bottom)
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(normX);
    mouseY.set(normY);
  };

  const handleMouseEnter = () => {
    if (!reduce && interactive) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={
        !reduce && interactive
          ? {
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }
          : undefined
      }
      className={cn(
        'group relative rounded-3xl border border-border/60 bg-card/75 backdrop-blur-xl',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_32px_-8px_rgba(0,0,0,0.35)]',
        'transition-all duration-300 ease-out overflow-hidden',
        interactive &&
          'hover:border-primary/45 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_40px_-10px_rgba(0,0,0,0.5)] cursor-pointer',
        className
      )}
    >
      {/* Subtle cursor reflection spotlight on hover */}
      {!reduce && interactive && isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(400px circle at 50% 0%, var(--primary)/10, transparent 70%)',
          }}
        />
      )}

      {/* Account live sync pulse indicator */}
      {hasRecentSync && (
        <div
          className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5"
          title="Synchronized recently"
        >
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: accountDotColor || 'var(--status-connected)' }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: accountDotColor || 'var(--status-connected)' }}
            />
          </span>
        </div>
      )}

      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
};
