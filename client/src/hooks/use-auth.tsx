// Passport Local Auth implementation
import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<SelectUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/user', {
          credentials: 'include', // Important: include session cookie
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else if (res.status === 401) {
          // Not authenticated - this is fine
          setUser(null);
        } else {
          throw new Error('Failed to check authentication');
        }
      } catch (err) {
        console.error('Session check error:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include session cookie
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Invalid username or password' }));
        throw new Error(errorData.message || 'Login failed');
      }

      const userData = await res.json();
      setUser(userData);
      return userData;
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back to ConstructTrack!",
      });
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || 'Unable to sign in. Please check your credentials and try again.',
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include session cookie
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Registration failed');
      }

      const data = await res.json();
      
      // Check if this is a pending approval response
      if (data.pendingApproval) {
        // Don't set user - they need to be approved first
        return { pendingApproval: true, message: data.message } as any;
      }
      
      // For approved users (shouldn't happen with new flow)
      setUser(data);
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.pendingApproval) {
        toast({
          title: "Registration successful",
          description: "Your account has been created. Please wait for an administrator to approve your access.",
          duration: 10000,
        });
      } else {
        toast({
          title: "Registration successful",
          description: "Welcome to ConstructTrack! You're now logged in.",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message || 'Unable to create account. Please try again.',
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include', // Important: include session cookie
      });

      if (!res.ok) {
        throw new Error('Logout failed');
      }

      setUser(null);
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
