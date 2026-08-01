export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-transparent">
      <div className="mx-auto flex h-[100px] w-full max-w-[1440px] items-center justify-between px-6 md:px-[35px]">
        <a
          href="#top"
          className="font-display text-[28px] font-extrabold tracking-tight text-foreground transition-transform duration-200 hover:-rotate-2 md:text-[45px]"
        >
          nuansic
        </a>
        <nav className="flex items-center gap-3 md:gap-[8px]">
          <button
            type="button"
            className="h-[46px] w-[95px] rounded-[30px] bg-muted text-[16px] font-medium text-foreground transition-all duration-200 hover:scale-105 active:scale-95 md:h-[57px] md:w-[113px] md:text-[20px]"
          >
            Sign In
          </button>
          <button
            type="button"
            className="h-[46px] w-[95px] rounded-[30px] bg-foreground text-[16px] font-medium text-background transition-all duration-200 hover:scale-105 active:scale-95 md:h-[57px] md:w-[113px] md:text-[20px]"
          >
            Sign Up
          </button>
        </nav>
      </div>
    </header>
  );
}
