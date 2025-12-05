// Passport Local Auth implementation
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { Loader2, Building2, Clock, CheckCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [pendingApproval, setPendingApproval] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data, {
      onSuccess: (result: any) => {
        if (result?.pendingApproval) {
          setPendingApproval(true);
        }
      }
    });
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" data-testid="loading-spinner" />
      </div>
    );
  }

  // Show pending approval screen
  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
            <CardDescription className="text-base mt-2">
              Your account has been created successfully. An administrator will review and approve your access shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                What happens next?
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>An administrator will review your registration</li>
                <li>You'll receive access once approved</li>
                <li>You can then sign in with your credentials</li>
              </ul>
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setPendingApproval(false)}
              data-testid="button-back-to-login"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Auth Forms */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-2 mb-8">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">ConstructTrack</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Sign in to your account to continue</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="your.email@example.com"
                                {...field}
                                data-testid="input-login-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                {...field}
                                data-testid="input-login-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                        data-testid="button-login-submit"
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>Get started with ConstructTrack today</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="your.email@example.com"
                                {...field}
                                data-testid="input-register-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Choose a unique username"
                                {...field}
                                data-testid="input-register-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Choose a password (minimum 6 characters)"
                                {...field}
                                data-testid="input-register-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="First name"
                                  {...field}
                                  data-testid="input-register-firstname"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Last name"
                                  {...field}
                                  data-testid="input-register-lastname"
                                />
                            </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-register-submit"
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-12">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-12 w-12 text-primary" />
            <h2 className="text-4xl font-bold">ConstructTrack</h2>
          </div>
          <p className="text-lg text-muted-foreground">
            Professional road construction project management system for tracking projects, managing roads,
            and monitoring construction progress.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Project Management</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage construction projects with comprehensive tracking
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor construction layers and progress with visual indicators
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Road Management</h3>
                <p className="text-sm text-muted-foreground">
                  Track multiple roads with dual carriageway support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
