import React, { useMemo } from "react";
import { LogoutOptions, OIDCProvider, OIDCProviderState, useAuth, useAuthClient } from "./oidc-provider";
import { AuthProviderOptions } from "./auth-provider";
import { getUniqueScopes } from "./utils";

type Auth0ProviderOptions = AuthProviderOptions & {
  audience?: string;
};

const Auth0Provider: React.FC<Auth0ProviderOptions> = ({
  children,
  domain,
  issuer,
  clientId,
  clientSecret,
  redirectUri,
  useRefreshTokens = false,
  scope = "openid profile email",
  audience,
  ...events
}) => (
  <OIDCProvider
    authority={domain}
    metadata={{
      issuer: issuer || `https://${domain}/`,
      authorization_endpoint: `https://${domain}/authorize`,
      token_endpoint: `https://${domain}/oauth/token`,
      end_session_endpoint: `https://${domain}/v2/logout`,
    }}
    client_id={clientId}
    client_secret={clientSecret}
    scope={getUniqueScopes(scope, useRefreshTokens ? "offline_access" : "")}
    response_type="code"
    loadUserInfo={false}
    automaticSilentRenew={useRefreshTokens}
    redirect_uri={redirectUri}
    post_logout_redirect_uri={redirectUri}
    extraQueryParams={audience ? { audience } : undefined}
    {...events}
  >
    {children}
  </OIDCProvider>
);

const useAuth0 = (): Omit<OIDCProviderState, "client"> => {
  const client = useAuthClient();
  const state = useAuth();
  return useMemo(
    () => ({
      ...state,
      logout: (opt?: LogoutOptions) =>
        state.logout({
          ...opt,
          extraQueryParams: {
            ...(opt ? opt.extraQueryParams : {}),
            client_id: client.settings.client_id,
          },
        }),
    }),
    [state, client],
  );
};

export { Auth0Provider, useAuth0 };
