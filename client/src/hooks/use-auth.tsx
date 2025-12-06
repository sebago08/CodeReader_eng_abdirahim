import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type AuthContextType = {
  user: SelectUser | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ pendingApproval: boolean; message: string } | SelectUser, Error, RegisterData>;
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
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserProfile = async (accessToken: string): Promise<SelectUser | null> => {
    try {
      console.log('[Auth] Fetching profile with token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NO TOKEN');
      const res = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      console.log('[Auth] Profile fetch response:', res.status);

      if (res.ok) {
        return await res.json();
      } else if (res.status === 403) {
        const data = await res.json();
        if (data.pendingApproval) {
          toast({
            title: "Account Pending Approval",
            description: "Your account is waiting for administrator approval. You'll be notified when approved.",
            duration: 10000,
          });
        }
        return null;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const client = supabase;

    const initAuth = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        
        if (session?.user) {
          setSupabaseUser(session.user);
          const profile = await fetchUserProfile(session.access_token);
          setUser(profile);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setSupabaseUser(session.user);
        const profile = await fetchUserProfile(session.access_token);
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setSupabaseUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (!supabase) {
        throw new Error('Authentication service not available');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        throw new Error('No session returned');
      }

      setSupabaseUser(data.user);

      let profile = await fetchUserProfile(data.session.access_token);
      
      if (!profile) {
        const linkRes = await fetch('/api/auth/link-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session.access_token}`,
          },
        });

        if (!linkRes.ok) {
          const errorData = await linkRes.json().catch(() => ({}));
          await supabase.auth.signOut();
          throw new Error(errorData.message || 'Unable to link your account. Please try again.');
        }

        const linkData = await linkRes.json();

        if (linkData.pendingApproval) {
          await supabase.auth.signOut();
          throw new Error('Your account is pending approval. Please wait for an administrator to approve your access.');
        }
        
        profile = linkData.user || linkData;
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Unable to load your profile. Please try again or contact support.');
      }

      setUser(profile);
      return profile;
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
        throw new Error('Authentication service not available');
      }

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            username: credentials.username,
            first_name: credentials.firstName || null,
            last_name: credentials.lastName || null,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Registration failed');
      }

      if (data.session) {
        setSupabaseUser(data.user);
        
        const res = await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            username: credentials.username,
            firstName: credentials.firstName,
            lastName: credentials.lastName,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to create user profile');
        }

        await supabase.auth.signOut();
        setSupabaseUser(null);
      }

      return { 
        pendingApproval: true, 
        message: "Registration successful. Please wait for an administrator to approve your account." 
      };
    },
    onSuccess: (data) => {
      if ('pendingApproval' in data && data.pendingApproval) {
        toast({
          title: "Registration successful",
          description: "Your account has been created. Please wait for an administrator to approve your access.",
          duration: 10000,
        });
      } else {
        toast({
          title: "Registration successful",
          description: "Welcome to ConstructTrack!",
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
      if (!supabase) {
        throw new Error('Authentication service not available');
      }

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw new Error(error.message);
      }

      setUser(null);
      setSupabaseUser(null);
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
        supabaseUser,
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
