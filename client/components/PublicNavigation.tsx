import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { User } from "lucide-react";

interface PublicNavigationProps {
  currentPage?: string;
}

export default function PublicNavigation({ currentPage }: PublicNavigationProps) {
  const { user, loading } = useAuth();

  const isCurrentPage = (page: string) => currentPage === page;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                Ojastack
              </span>
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link 
                  to="/features" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isCurrentPage('features') 
                      ? 'text-foreground border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Features
                </Link>
                <Link 
                  to="/pricing" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isCurrentPage('pricing') 
                      ? 'text-foreground border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pricing
                </Link>
                <Link 
                  to="/docs" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isCurrentPage('docs') 
                      ? 'text-foreground border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Docs
                </Link>
                <Link 
                  to="/contact" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isCurrentPage('contact') 
                      ? 'text-foreground border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="flex items-center space-x-4">
                <div className="w-16 h-8 bg-muted animate-pulse rounded"></div>
                <div className="w-24 h-8 bg-muted animate-pulse rounded"></div>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Button variant="ghost" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/dashboard/settings/profile" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    My Account
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}