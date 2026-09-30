import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Mail, Calendar, FolderOpen, CheckSquare, GraduationCap } from 'lucide-react';

export type LogoState = 'idle' | 'connected' | 'syncing' | 'error' | 'snap';

interface ProviderLogoProps {
  provider: string;
  size?: number;
  state?: LogoState;
  className?: string;
  title?: string;
}

const SIZE_CLASS = (n: number) => ({ width: n, height: n });

const BrandMark: React.FC<{ provider: string; size: number }> = ({ provider, size }) => {
  const s = SIZE_CLASS(size);
  const icon = Math.round(size * 0.52);
  switch (provider) {
    case 'google':
      return (
        <svg style={s} viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      );
    case 'microsoft':
      return (
        <svg style={s} viewBox="0 0 24 24" aria-hidden>
          <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
          <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
          <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
          <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
        </svg>
      );
    case 'github':
      return (
        <svg style={s} viewBox="0 0 24 24" aria-hidden className="fill-current">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      );
    case 'notion':
      return (
        <svg style={s} viewBox="0 0 24 24" aria-hidden className="fill-current">
          <path d="M4.5 3.5h13.2c.7 0 1.3.3 1.7.9l1.1 1.6c.2.3.3.6.3.9v11.6c0 .8-.7 1.5-1.5 1.5H6.1L2.8 16.3c-.5-.5-.8-1.2-.8-1.9V5c0-.8.7-1.5 1.5-1.5h1z" fill="currentColor" opacity=".12" />
          <path d="M7.2 7.2v9.2h1.6V13h4.2c1.6 0 2.7-1 2.7-2.5S14.6 8 13 8H7.2zm1.6 1.5h3.8c.7 0 1.1.4 1.1 1s-.4 1-1.1 1H8.8V8.7z" />
        </svg>
      );
    case 'todoist':
      return (
        <svg style={s} viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#E44332" />
          <path d="M6.5 12.2l3.1 3.1 8-8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'slack':
      return (
        <svg style={s} viewBox="0 0 24 24" aria-hidden>
          <path fill="#E01E5A" d="M6.5 15.2A2.3 2.3 0 114.2 13h2.3v2.2z" />
          <path fill="#E01E5A" d="M7.7 15.2a2.3 2.3 0 114.6 0v5.5a2.3 2.3 0 11-4.6 0v-5.5z" />
          <path fill="#36C5F0" d="M8.8 6.5A2.3 2.3 0 1111 4.2v2.3H8.8z" />
          <path fill="#36C5F0" d="M8.8 7.7a2.3 2.3 0 110 4.6H3.3a2.3 2.3 0 110-4.6h5.5z" />
          <path fill="#2EB67D" d="M17.5 8.8A2.3 2.3 0 1119.8 11h-2.3V8.8z" />
          <path fill="#2EB67D" d="M16.3 8.8a2.3 2.3 0 11-4.6 0V3.3a2.3 2.3 0 114.6 0v5.5z" />
          <path fill="#ECB22E" d="M15.2 17.5A2.3 2.3 0 1113 19.8v-2.3h2.2z" />
          <path fill="#ECB22E" d="M15.2 16.3a2.3 2.3 0 110-4.6h5.5a2.3 2.3 0 110 4.6h-5.5z" />
        </svg>
      );
    case 'linear':
      return (
        <svg style={s} viewBox="0 0 24 24" aria-hidden>
          <rect width="24" height="24" rx="6" fill="#5E6AD2" />
          <path d="M6 16.5L16.5 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'outlook':
    case 'gmail':
      return <Mail style={{ width: icon, height: icon }} className="text-primary" />;
    case 'calendar':
      return <Calendar style={{ width: icon, height: icon }} className="text-primary" />;
    case 'drive':
      return <FolderOpen style={{ width: icon, height: icon }} className="text-primary" />;
    case 'classroom':
      return <GraduationCap style={{ width: icon, height: icon }} className="text-primary" />;
    case 'tasks':
      return <CheckSquare style={{ width: icon, height: icon }} className="text-primary" />;
    default:
      return (
        <span
          className="font-display font-extrabold leading-none"
          style={{ fontSize: Math.max(10, icon * 0.7) }}
        >
          {provider.slice(0, 1).toUpperCase()}
        </span>
      );
  }
};

export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  provider,
  size = 28,
  state = 'idle',
  className,
  title,
}) => {
  const reduce = useReducedMotion();
  const pad = Math.round(size * 0.28);

  return (
    <motion.span
      title={title}
      initial={state === 'snap' && !reduce ? { scale: 0.6, rotate: -12 } : false}
      animate={
        reduce
          ? { scale: 1 }
          : state === 'idle' || state === 'connected'
            ? { y: [0, -2, 0] }
            : state === 'snap'
              ? { scale: 1, rotate: 0 }
              : { scale: 1 }
      }
      transition={
        reduce
          ? { duration: 0.01 }
          : state === 'idle' || state === 'connected'
            ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 480, damping: 18 }
      }
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-card border border-border/60 shrink-0',
        state === 'syncing' && !reduce && 'logo-syncing',
        state === 'error' && 'logo-error',
        className
      )}
      style={{ width: size + pad, height: size + pad }}
    >
      <BrandMark provider={provider} size={size} />
    </motion.span>
  );
};
