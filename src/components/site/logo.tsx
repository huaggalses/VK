/** Логотип-небоскрёб: три дома в одну строку */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 21V10.5l4.5-2.5v13M8 21V5l7.5 2.5V21M15.5 21V9.5l5 1.5v10M2 21h20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 9.5h2.5M10.5 13h2.5M10.5 16.5h2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/** Плитка-аватар сообщества: градиент + логотип */
export function LogoTile({ className = "size-10" }: { className?: string }) {
  return (
    <div
      className={`${className} grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/25`}
    >
      <LogoMark className="size-[55%]" />
    </div>
  );
}
