type Props = {
  size?: number;
  className?: string;
  animate?: boolean;
};

export function Flame({ size = 24, className = "", animate = true }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={`${animate ? "animate-flame" : ""} ${className}`}
      aria-hidden
    >
      <path
        d="M16 2c1.5 5 6 6.5 6 12a6 6 0 0 1-12 0c0-2 1-3.5 1-5-2 1.5-4 4-4 8a9 9 0 0 0 18 0c0-8-6-10-9-15Z"
        fill="url(#flame-grad)"
      />
      <path
        d="M16 13c.8 2.2 3 3 3 5.5a3 3 0 1 1-6 0c0-1.5 1.5-2.5 3-5.5Z"
        fill="#FFF3B0"
      />
      <defs>
        <linearGradient id="flame-grad" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFB547" />
          <stop offset="0.6" stopColor="#FF6A1F" />
          <stop offset="1" stopColor="#D63A0F" />
        </linearGradient>
      </defs>
    </svg>
  );
}
