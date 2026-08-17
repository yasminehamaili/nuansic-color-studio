export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-transparent">
      <div className="mx-auto flex h-[64px] w-full max-w-[1500px] items-center justify-between px-6">
        <a
          href="#top"
          className="font-display text-[20px] font-extrabold tracking-tight text-foreground transition-transform duration-200 hover:-rotate-2 md:text-[27px]"
        >
          nuansic
        </a>
        <nav className="flex items-center gap-2">
          <button
            type="button"
            className="h-[34px] w-[72px] rounded-[30px] bg-muted text-[13px] font-medium text-foreground transition-all duration-200 hover:scale-105 active:scale-95 md:w-[80px]"
          >
            Sign In
          </button>
          <button
            type="button"
            className="h-[34px] w-[72px] rounded-[30px] bg-foreground text-[13px] font-medium text-background transition-all duration-200 hover:scale-105 active:scale-95 md:w-[80px]"
          >
            Sign Up
          </button>
        </nav>
      </div>
    </header>
  );
}
