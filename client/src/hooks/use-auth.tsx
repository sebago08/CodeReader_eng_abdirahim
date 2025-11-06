// Supabase Auth implementation
import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

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
  email: string;
  username: string;
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

  // Helper function to get user profile from backend
  const fetchUserProfile = async (accessToken: string): Promise<SelectUser | null> => {
    try {
      console.log('[Auth] Fetching user profile with token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NO TOKEN');
      
      const res = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('[Auth] User profile response status:', res.status);

      if (res.ok) {
        const userData = await res.json();
        console.log('[Auth] User profile fetched successfully:', userData?.username);
        return userData;
      }
      
      const errorText = await res.text();
      console.error('[Auth] Failed to fetch user profile:', res.status, errorText);
      return null;
    } catch (err) {
      console.error('[Auth] Error fetching user profile:', err);
      return null;
    }
  };

  // Check for existing session on mount and listen for auth changes
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setUser(null);
        } else if (session?.access_token) {
          const userProfile = await fetchUserProfile(session.access_token);
          setUser(userProfile);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setError(err as Error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (session?.access_token) {
        const userProfile = await fetchUserProfile(session.access_token);
        setUser(userProfile);
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (!supabase) {
        throw new Error('Supabase not configured. Please contact administrator.');
      }

      console.log('[Auth] Starting login for:', credentials.email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      console.log('[Auth] Supabase signIn response:', {
        hasSession: !!data.session,
        hasAccessToken: !!data.session?.access_token,
        error: error?.message
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session?.access_token) {
        throw new Error('No session token received');
      }

      // Fetch user profile from backend
      const userProfile = await fetchUserProfile(data.session.access_token);
      if (!userProfile) {
        throw new Error('Failed to fetch user profile');
      }

      setUser(userProfile);
      return userProfile;
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
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      console.log('[Auth] Starting registration for:', credentials.email);

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            username: credentials.username,
            first_name: credentials.firstName || '',
            last_name: credentials.lastName || '',
          },
        },
      });

      console.log('[Auth] Supabase signUp response:', {
        hasSession: !!data.session,
        hasAccessToken: !!data.session?.access_token,
        error: error?.message
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session?.access_token) {
        // Email confirmation may be required
        throw new Error('Please check your email to confirm your account');
      }

      // Wait a bit for session to be persisted to localStorage
      console.log('[Auth] Waiting for session persistence...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify session is available
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Auth] Session check after delay:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token
      });

      if (!session?.access_token) {
        throw new Error('Session not properly established. Please try logging in.');
      }

      // Fetch user profile from backend (will auto-create user)
      const userProfile = await fetchUserProfile(session.access_token);
      if (!userProfile) {
        throw new Error('Failed to create user profile');
      }

      setUser(userProfile);
      return userProfile;
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Welcome to ConstructTrack! You're now logged in.",
      });
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
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
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
