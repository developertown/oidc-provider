import { UserProfile } from "oidc-client-ts";

export interface AuthState {
  error?: Error;
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: UserProfile;
}

export const initialState: AuthState = {
  error: undefined,
  isAuthenticated: false,
  isLoading: true,
  user: undefined,
};
