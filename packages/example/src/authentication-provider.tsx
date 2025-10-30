import {
  // CognitoProvider as OpenIDAuthenticationProvider,
  // useCongito as useAuth,
  Auth0Provider as OpenIDAuthenticationProvider,
  useAuth0 as useAuth,
  // AzureProvider as OpenIDAuthenticationProvider,
  // useAzure as useAuth,
  // OIDCProvider as OpenIDAuthenticationProvider,
  // useAuth,
  withAuthenticationRequired,
} from "@developertown/oidc-provider";

import type {
  // CognitoProviderProps as OpenIDAuthenticationProviderProps,
  Auth0ProviderProps as OpenIDAuthenticationProviderProps,
  // AzureProviderProps as OpenIDAuthenticationProviderProps,
  // OIDCProviderProps as OpenIDAuthenticationProviderProps,
  Token,
} from "@developertown/oidc-provider";
import React, { createContext, useCallback, useContext, useState } from "react";

const AccessTokenContext = createContext<Token | undefined>(undefined);

const AccessTokenProvider: React.FC<{ accessToken?: Token, children?: React.ReactNode }> = ({
  accessToken,
  children,
}) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated && !accessToken) {
    return null;
  }
  return (
    <AccessTokenContext.Provider value={accessToken}>
      {children}
    </AccessTokenContext.Provider>
  );
};

export type AuthenticationProviderProps = OpenIDAuthenticationProviderProps & {children?: React.ReactNode};

export const AuthenticationProvider: React.FC<AuthenticationProviderProps> = ({
  children,
  onAccessTokenChanged,
  ...OpenIDAuthenticationProviderProps
}) => {
  const [accessToken, setAccessToken] = useState<Token | undefined>(undefined);

  const handleAccessTokenChange = useCallback(
    (token: Token) => {
      setAccessToken(token);
      if (onAccessTokenChanged) {
        onAccessTokenChanged(token);
      }
    },
    [setAccessToken, onAccessTokenChanged]
  );

  return (
    <OpenIDAuthenticationProvider
      {...OpenIDAuthenticationProviderProps}
      onAccessTokenChanged={handleAccessTokenChange}
    >
      <AccessTokenProvider accessToken={accessToken}>
        {children}
      </AccessTokenProvider>
    </OpenIDAuthenticationProvider>
  );
};

export const useAccessToken = (): Token | undefined => {
  const token = useContext(AccessTokenContext);
  return token;
};

export { useAuth, withAuthenticationRequired };
