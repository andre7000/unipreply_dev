import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  reload,
  getRedirectResult,
} from "firebase/auth";
import { auth } from "@/config/firebaseConfig";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;

    // Check for redirect result first (for Google sign-in)
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user && isComponentMounted.current) {
          console.log("Redirect result found, user:", result.user.uid);
          // The onAuthStateChanged will handle setting the user
        }
      } catch (error) {
        console.error("Error checking redirect result:", error);
        // Continue with normal auth state check
      }
    };
    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isComponentMounted.current) return;

      if (user) {
        console.log("Auth state changed, user:", user.uid);
        // Set user immediately without reload to avoid delays
        if (isComponentMounted.current) {
          setCurrentUser(user);
          setLoading(false);
        }

        // Reload user in background to get fresh auth state (especially for email verification)
        try {
          await reload(user);
          const freshUser = auth.currentUser;
          if (freshUser && isComponentMounted.current) {
            console.log("User reloaded, fresh user:", freshUser.uid);
            setCurrentUser(freshUser);
          }
        } catch (error) {
          console.error("Error reloading user:", error);
          // User is already set, so continue
        }
      } else {
        if (isComponentMounted.current) {
          setCurrentUser(null);
          setLoading(false);
        }
      }
    });

    // Setup visibility change listener for email verification updates
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        auth.currentUser &&
        !auth.currentUser.emailVerified
      ) {
        try {
          await reload(auth.currentUser);
          const freshUser = auth.currentUser;
          if (freshUser && isComponentMounted.current) {
            setCurrentUser(freshUser);
          }
        } catch (error) {
          console.error("Error reloading user on visibility change:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isComponentMounted.current = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value = {
    currentUser,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
