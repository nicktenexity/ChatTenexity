import { cn } from '~/utils';

export default function TenexityLogo({
  alt = 'Tenexity',
  className,
  imageClassName,
}: {
  alt?: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={cn('relative', className)} role="img" aria-label={alt}>
      <img
        src="assets/tenexity-logo-black.png"
        className={cn('block h-full w-full object-contain dark:hidden', imageClassName)}
        alt=""
        aria-hidden="true"
      />
      <img
        src="assets/tenexity-logo-white.png"
        className={cn('hidden h-full w-full object-contain dark:block', imageClassName)}
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
