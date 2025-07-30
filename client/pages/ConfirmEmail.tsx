import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      // Handle different confirmation types
      if (!token_hash) {
        setStatus('error');
        setMessage('Invalid confirmation link. Please check your email and try again.');
        return;
      }

      try {
        let result;
        
        if (type === 'email') {
          // Email confirmation
          result = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email',
          });
        } else {
          // Try generic confirmation (for some Supabase setups)
          result = await supabase.auth.verifyOtp({
            token_hash,
            type: 'signup',
          });
        }

        if (result.error) {
          setStatus('error');
          setMessage(result.error.message);
          toast({
            title: "Email Confirmation Failed",
            description: result.error.message,
            variant: "destructive",
          });
        } else {
          setStatus('success');
          setMessage('Your email has been confirmed successfully! You are now signed in.');
          toast({
            title: "Email Confirmed!",
            description: "Welcome to Ojastack. Redirecting to your dashboard...",
          });
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        toast({
          title: "Confirmation Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    };

    confirmEmail();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-gradient-via/5 to-gradient-to/5">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex-shrink-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-gradient-to bg-clip-text text-transparent">
                Ojastack
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              Email Confirmation
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              Confirming your email
            </h2>
            <p className="mt-2 text-muted-foreground">
              Please wait while we verify your email address
            </p>
          </div>

          <Card className="bg-background/80 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center flex items-center justify-center">
                {status === 'loading' && <Loader2 className="h-6 w-6 mr-2 animate-spin" />}
                {status === 'success' && <CheckCircle className="h-6 w-6 mr-2 text-green-500" />}
                {status === 'error' && <AlertCircle className="h-6 w-6 mr-2 text-red-500" />}
                {status === 'loading' && 'Confirming...'}
                {status === 'success' && 'Success!'}
                {status === 'error' && 'Error'}
              </CardTitle>
              <CardDescription className="text-center">
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {status === 'success' && (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      You will be redirected to your dashboard in a few seconds...
                    </p>
                  </div>
                  <Link to="/dashboard">
                    <Button className="w-full">
                      Go to Dashboard Now
                    </Button>
                  </Link>
                </div>
              )}

              {status === 'error' && (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      {message}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Link to="/signup">
                      <Button className="w-full">
                        Try Signing Up Again
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="outline" className="w-full">
                        Back to Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {status === 'loading' && (
                <div className="text-center">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      Please wait while we confirm your email address...
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Need help?{" "}
              <Link to="/contact" className="text-primary hover:underline font-medium">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}