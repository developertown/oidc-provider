import {
  // CognitoProvider as OpenIDAuthenticationProvider,
  // CognitoProviderProps as OpenIDAuthenticationProvider,
  // useCongito as useAuth,
  //
  Auth0Provider as OpenIDAuthenticationProvider,
  Auth0ProviderProps as OpenIDAuthenticationProviderProps,
  useAuth0 as useAuth,
  //
  // AzureProvider as OpenIDAuthenticationProvider,
  // AzureProviderProps as OpenIDAuthenticationProviderProps,
  // useAzure as useAuth,
  //
  // OIDCProvider as OpenIDAuthenticationProvider,
  // OIDCProviderProps as OpenIDAuthenticationProviderProps,
  // useAuth,
  Token,
  withAuthenticationRequired,
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
  ...OpenIDAuthenticationProviderProps
}) => {
  const [accessToken, setAccessToken] = useState<Token | undefined>(undefined);

  const handleAccessTokenChange = useCallback(
    (token: Token) => {
      setAccessToken(token);
    },
    [setAccessToken]
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
