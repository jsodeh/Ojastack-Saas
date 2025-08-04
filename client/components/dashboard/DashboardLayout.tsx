import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Bot,
  BarChart3,
  Settings,
  Users,
  MessageSquare,
  Zap,
  Menu,
  Bell,
  Search,
  Plus,
  LogOut,
  User,
  CreditCard,
  HelpCircle,
  Database,
  Code,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/useProfile";
import OnboardingTaskbar from "./OnboardingTaskbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: BarChart3,
      current: location.pathname === "/dashboard",
    },
    {
      name: "AI Agents",
      href: "/dashboard/agents",
      icon: Bot,
      current: location.pathname.startsWith("/dashboard/agents"),
    },
    {
      name: "Conversations",
      href: "/dashboard/conversations",
      icon: MessageSquare,
      current: location.pathname.startsWith("/dashboard/conversations"),
    },
    {
      name: "Knowledge Base",
      href: "/dashboard/knowledge",
      icon: Database,
      current: location.pathname.startsWith("/dashboard/knowledge"),
    },
    {
      name: "API Reference",
      href: "/dashboard/api",
      icon: Code,
      current: location.pathname.startsWith("/dashboard/api"),
    },
    {
      name: "Integrations",
      href: "/dashboard/integrations",
      icon: Zap,
      current: location.pathname.startsWith("/dashboard/integrations"),
    },
    {
      name: "Team",
      href: "/dashboard/team",
      icon: Users,
      current: location.pathname.startsWith("/dashboard/team"),
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      current: location.pathname.startsWith("/dashboard/settings"),
    },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <div className="flex flex-col h-full">
            <div className="flex items-center px-4 py-6">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                  Ojastack
                </span>
              </Link>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.current
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-muted/30 px-6">
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                Ojastack
              </span>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                          item.current
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Usage</span>
                    <Badge variant="secondary">
                      {profile?.plan || 'Starter'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Conversations</span>
                      <span>
                        {profileLoading ? '...' : `${profile?.current_usage || 0} / ${profile?.usage_limit || 1000}`}
                      </span>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ 
                          width: profileLoading ? "0%" : `${Math.min(100, ((profile?.current_usage || 0) / (profile?.usage_limit || 1000)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-3">
                    <Plus className="h-4 w-4 mr-2" />
                    Upgrade
                  </Button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/95 backdrop-blur px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">

          {/* Separator */}
          <div className="h-6 w-px bg-border lg:hidden" />

          <div className="flex flex-1 justify-between items-center gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 max-w-md">
              <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-muted-foreground pl-3" />
              <input
                className="block h-full w-full border-0 py-0 pl-10 pr-0 text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm bg-transparent"
                placeholder="Search agents, conversations..."
                type="search"
              />
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user?.user_metadata?.avatar_url}
                        alt="Profile"
                      />
                      <AvatarFallback>
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.user_metadata?.full_name || user?.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings/billing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/help">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Help
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Onboarding Taskbar */}
      <OnboardingTaskbar />
    </div>
  );
}
