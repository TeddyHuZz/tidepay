interface LogoMarkProps {
  className?: string;
  size?: number;
}

export function LogoMark({ className = "h-6 w-6", size = 28 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect width="28" height="28" rx="6" fill="#00BFB3" />
      <path
        d="M5 15c3 0 3-4 6-4s3 4 6 4 3-4 6-4M5 20c3 0 3-4 6-4s3 4 6 4 3-4 6-4"
        stroke="#022425"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-semibold text-lg tracking-tight text-white">TidePay</span>
    </span>
  );
}
