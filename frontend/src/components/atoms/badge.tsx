import { cn } from '@/lib/cn';

type Tone = 'verified' | 'soon' | 'gold';

const tones: Record<Tone, string> = {
  verified: 'bg-sage-soft text-sage',
  soon: 'bg-terra-soft text-terra',
  gold: 'bg-gold-soft text-gold-2',
};

export interface BadgeProps {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold tracking-[0.04em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
