import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { getAuthStatus } from "./lib/instagram";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

function App() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await getAuthStatus();
        setIsAuthenticated(status.authenticated);
        
        // Redirect to login if not authenticated and not already on login page
        if (!status.authenticated && location !== "/login") {
          setLocation("/login");
        } else if (status.authenticated && location === "/login") {
          setLocation("/");
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to check authentication status. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
