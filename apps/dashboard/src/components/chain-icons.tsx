import { cn } from "@/lib/utils";

/**
 * Official Ethereum Diamond Logo
 */
export function EthereumIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-3.5 shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M12 1.5L4.5 13.885L12 18.25L19.5 13.885L12 1.5Z"
        fill="#627EEA"
      />
      <path
        d="M12 1.5V18.25L19.5 13.885L12 1.5Z"
        fill="#4560C4"
      />
      <path
        d="M12 19.648L4.5 15.283L12 22.5L19.5 15.283L12 19.648Z"
        fill="#627EEA"
      />
      <path
        d="M12 19.648V22.5L19.5 15.283L12 19.648Z"
        fill="#4560C4"
      />
      <path
        d="M12 16.953L19.5 12.588L12 9.172V16.953Z"
        fill="#4560C4"
      />
      <path
        d="M4.5 12.588L12 16.953V9.172L4.5 12.588Z"
        fill="#627EEA"
      />
    </svg>
  );
}

/**
 * Official Base Network Logo
 */
export function BaseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("size-3.5 shrink-0", className)}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="#0052FF" />
      <path
        d="M23.9573 32.5C22.3527 32.4676 20.7898 31.9838 19.4487 31.1044C18.1076 30.2249 17.0427 28.9855 16.3767 27.5289C15.7108 26.0724 15.4707 24.4578 15.6842 22.8711C15.8977 21.2843 16.5561 19.79 17.5835 18.5602C18.611 17.3303 19.9658 16.4149 21.4919 15.9193C23.018 15.4237 24.6534 15.3681 26.2098 15.7589C27.7663 16.1497 29.1804 16.9709 30.2894 18.1281C31.3985 19.2853 32.1574 20.7315 32.4787 22.3H41C40.5628 17.9606 38.4703 13.9546 35.1552 11.1109C31.8402 8.26711 27.5563 6.803 23.1895 7.02133C18.8226 7.23967 14.707 9.12377 11.6937 12.284C8.68042 15.4442 7 19.6386 7 24C7 28.3613 8.68042 32.5558 11.6937 35.716C14.707 38.8762 18.8226 40.7603 23.1895 40.9787C27.5563 41.197 31.8402 39.7329 35.1552 36.8891C38.4703 34.0454 40.5628 30.0394 41 25.7H32.4787C32.4787 29.1 27.3658 32.5 23.9573 32.5Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Official Solana Gradient Icon
 */
export function SolanaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-3.5 shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M4.8 17.5c.2-.2.4-.3.7-.3h14.6c.4 0 .6.5.3.8l-2.9 2.9c-.2.2-.4.3-.7.3H2.2c-.4 0-.6-.5-.3-.8l2.9-2.9z"
        fill="url(#tp-sol-1)"
      />
      <path
        d="M4.8 2.5c.2-.2.4-.3.7-.3h14.6c.4 0 .6.5.3.8l-2.9 2.9c-.2.2-.4.3-.7.3H2.2c-.4 0-.6-.5-.3-.8l2.9-2.9z"
        fill="url(#tp-sol-2)"
      />
      <path
        d="M19.2 10c-.2-.2-.4-.3-.7-.3H3.9c-.4 0-.6.5-.3.8l2.9 2.9c.2.2.4.3.7.3h14.6c.4 0 .6-.5.3-.8l-2.9-2.9z"
        fill="url(#tp-sol-3)"
      />
      <defs>
        <linearGradient id="tp-sol-1" x1="20" y1="21" x2="2" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="tp-sol-2" x1="20" y1="6" x2="2" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="tp-sol-3" x1="2" y1="14" x2="20" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
