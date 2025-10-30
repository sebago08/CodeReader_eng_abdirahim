// Supabase Auth implementation
import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured, withTimeout } from "../lib/supabase";
import type { User as SupabaseUser, AuthError } from "@supabase/supabase-js";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isDevMode: boolean;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
  loginWithGoogle: () => Promise<void>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

// Helper to check if we're in development mode
const isDevelopmentMode = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<SelectUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  // Dev mode: auto-login as dev user
  const loginAsDevUser = async () => {
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Dev login failed');
      }

      const profile = await res.json();
      setUser(profile);
      setIsDevMode(true);
      console.log('🔧 Development mode: Auto-logged in as dev user');
    } catch (err) {
      console.error('Dev login error:', err);
      setError(err as Error);
    }
  };

  // Sync Supabase user to backend and load profile
  const syncUser = async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser) {
      setUser(null);
      return;
    }

    try {
      // Get session token
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No access token');
      }

      // Get user profile (middleware auto-creates if doesn't exist)
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      if (!res.ok) {
        throw new Error('Failed to sync user profile');
      }

      const profile = await res.json();
      setUser(profile);
      setIsDevMode(false);
    } catch (err) {
      console.error('Error syncing user:', err);
      setError(err as Error);
    }
  };

  // Helper to fetch user profile immediately after auth
  const fetchUserProfile = async (): Promise<SelectUser> => {
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Session not established');
    }
    
    const res = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
    });
    
    if (!res.ok) {
      throw new Error('Failed to load user profile');
    }
    
    const profile = await res.json();
    setUser(profile);
    setIsDevMode(false);
    return profile;
  };

  // Listen to auth state changes
  useEffect(() => {
    // If Supabase is not configured, use dev mode
    if (!supabase || !isSupabaseConfigured()) {
      if (isDevelopmentMode()) {
        loginAsDevUser().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
      return;
    }

    // Try to get initial session with timeout
    const timeout = setTimeout(() => {
      console.warn('Supabase session timeout - falling back to dev mode');
      if (isDevelopmentMode()) {
        loginAsDevUser().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeout);
        
        if (error) {
          console.error('Supabase session error:', error);
          if (isDevelopmentMode()) {
            return loginAsDevUser();
          }
        }
        
        if (session?.user) {
          syncUser(session.user);
        } else if (isDevelopmentMode()) {
          // No session and in dev mode - auto-login
          return loginAsDevUser();
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('Supabase auth error:', err);
        if (isDevelopmentMode()) {
          loginAsDevUser();
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await syncUser(session?.user ?? null);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        }),
        8000
      );

      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

      // Fetch and sync user profile immediately
      const profile = await fetchUserProfile();
      return profile;
    },
    onError: (error: AuthError | Error) => {
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
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              first_name: credentials.firstName,
              last_name: credentials.lastName,
            }
          }
        }),
        8000
      );

      if (error) throw error;
      if (!data.user) throw new Error('Registration failed');

      // Fetch and sync user profile immediately
      const profile = await fetchUserProfile();
      return profile;
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Welcome to ConstructTrack! You're now logged in.",
      });
    },
    onError: (error: AuthError | Error) => {
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
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      setUser(null);
    },
    onError: (error: AuthError | Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loginWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });

    if (error) {
      toast({
        title: "Google sign-in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isDevMode,
        loginMutation,
        logoutMutation,
        registerMutation,
        loginWithGoogle,
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
