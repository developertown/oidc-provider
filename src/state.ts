import { Profile } from "oidc-client";

export interface AuthState {
  error?: Error;
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: Profile;
}

export const initialState: AuthState = {
  error: undefined,
  isAuthenticated: false,
  isLoading: true,
  user: undefined,
};
