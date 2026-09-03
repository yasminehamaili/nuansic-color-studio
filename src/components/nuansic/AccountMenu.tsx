import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Sparkles, User, Palette, Settings, HelpCircle, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase-client";
import { usernameFromId, avatarUrlFromId } from "@/lib/username";

export function AccountMenu({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const username = usernameFromId(userId);
  const avatarUrl = avatarUrlFromId(userId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-[34px] items-center gap-2 rounded-[30px] bg-muted px-2 pr-3 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <img src={avatarUrl} alt={username} className="h-[26px] w-[26px] rounded-full" />
          <span className="hidden font-display text-[13px] font-medium text-foreground sm:inline">
            {username}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-foreground opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[200px] bg-[#F5F5F5]">
        <DropdownMenuLabel className="font-display text-[13px]">{username}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/upgrade" className="flex items-center gap-2 font-display text-[14px]">
            <Sparkles className="h-4 w-4" />
            Upgrade
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2 font-display text-[14px]">
            <User className="h-4 w-4" />
            User Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/saved-palettes" className="flex items-center gap-2 font-display text-[14px]">
            <Palette className="h-4 w-4" />
            Saved Palettes
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2 font-display text-[14px]">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/help-center" className="flex items-center gap-2 font-display text-[14px]">
            <HelpCircle className="h-4 w-4" />
            Help Center
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 font-display text-[14px]">
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
