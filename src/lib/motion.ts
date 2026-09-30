export const springSnappy = { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.7 };
export const springSoft = { type: 'spring' as const, stiffness: 280, damping: 28, mass: 0.9 };
export const springLayout = { type: 'spring' as const, stiffness: 420, damping: 34 };
export const springPalette = { type: 'spring' as const, stiffness: 380, damping: 26, mass: 0.85 };

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeOnly = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
