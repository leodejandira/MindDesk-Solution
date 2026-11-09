import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setApiToken, setOnUnauthorized } from "./api";
import { decodeJwt, type JwtPayload } from "./jwt";
import { storage } from "./storage";

const KEY = "minddesk_token";

type Auth = {
  ready: boolean;
  user: JwtPayload | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Auth>(null as unknown as Auth);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<JwtPayload | null>(null);

  const apply = useCallback((token: string | null) => {
    const payload = decodeJwt(token);
    setApiToken(payload ? token : null);
    setUser(payload);
  }, []);

  const signOut = useCallback(async () => {
    apply(null);
    await storage.del(KEY);
  }, [apply]);

  useEffect(() => {
    setOnUnauthorized(() => void signOut());
    storage
      .get(KEY)
      .then(apply)
      .finally(() => setReady(true));
  }, [apply, signOut]);

  const signIn = async (email: string, password: string) => {
    const { token } = await api<{ token: string }>("/auth/login", { method: "POST", body: { email, password } });
    await storage.set(KEY, token);
    apply(token);
  };

  return (
    <AuthCtx.Provider value={{ ready, user, isAdmin: user?.role === "admin", signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
