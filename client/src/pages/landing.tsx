import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ViewMode = "welcome" | "signin" | "signup";

export default function Landing() {
  const [viewMode, setViewMode] = useState<ViewMode>("welcome");
  const { loginMutation, registerMutation } = useAuth();

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
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const handleBackToWelcome = () => {
    setViewMode("welcome");
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Black Background */}
      <div className="w-1/2 bg-black text-white p-12 flex flex-col justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white transform rotate-45"></div>
          <h1 className="text-2xl font-bold">ConstructTrack</h1>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <h2 className="text-5xl font-bold leading-tight">
            Your Project, Perfectly<br />Planned.
          </h2>
          <p className="text-muted-foreground text-lg max-w-md">
            The ultimate platform for tracking construction projects from groundbreaking to completion.
          </p>
        </div>

        {/* Empty space for balance */}
        <div></div>
      </div>

      {/* Right Side - Dark Background */}
      <div className="w-1/2 bg-background flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          {viewMode === "welcome" && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-foreground mb-8">Welcome Back</h2>
              </div>

              {/* Sign In / Sign Up Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setViewMode("signin")}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                  data-testid="button-sign-in"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setViewMode("signup")}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                  data-testid="button-sign-up"
                >
                  Sign Up
                </button>
              </div>

              {/* Terms and Privacy */}
              <p className="text-center text-sm text-muted-foreground">
                By continuing, you agree to ConstructTrack's{" "}
                <a href="#" className="text-blue-400 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-400 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          )}

          {viewMode === "signin" && (
            <div className="space-y-6">
              <button
                onClick={handleBackToWelcome}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-to-welcome"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>

              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-2">Sign In</h2>
                <p className="text-muted-foreground">Welcome back! Please enter your details.</p>
              </div>

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
                    className="w-full bg-black hover:bg-gray-800 text-white"
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

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setViewMode("signup")}
                    className="text-blue-400 hover:underline font-medium"
                    data-testid="link-to-signup"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </div>
          )}

          {viewMode === "signup" && (
            <div className="space-y-6">
              <button
                onClick={handleBackToWelcome}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-to-welcome"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>

              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-2">Create Account</h2>
                <p className="text-muted-foreground">Get started with ConstructTrack today</p>
              </div>

              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Choose a username"
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Choose a password"
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
                    className="w-full bg-black hover:bg-gray-800 text-white"
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

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => setViewMode("signin")}
                    className="text-blue-400 hover:underline font-medium"
                    data-testid="link-to-signin"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
