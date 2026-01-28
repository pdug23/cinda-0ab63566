import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  className?: string;
}

export const UserMenu = ({ className }: UserMenuProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Only show when signed in
  if (!user) return null;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "User";

  // Truncate long display names
  const truncatedName =
    displayName.length > 24 ? displayName.slice(0, 24) + "…" : displayName;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`h-7 w-7 rounded-full border border-card-foreground/20 bg-card-foreground/[0.03] hover:bg-card-foreground/10 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className}`}
        aria-label="User menu"
      >
        <User className="h-4 w-4 text-card-foreground/60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="bg-card border-border/40 min-w-[160px] z-50"
      >
        <DropdownMenuLabel className="text-card-foreground/70 font-normal text-sm truncate">
          {truncatedName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/40" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
