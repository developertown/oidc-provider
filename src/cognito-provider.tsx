import React, { useMemo } from "react";
import { OIDCProvider, useAuth, useAuthClient, LogoutOptions, OIDCProviderState } from "./oidc-provider";
import { AuthProviderOptions } from "./auth-provider";

const CognitoProvider: React.FC<AuthProviderOptions> = ({
  children,
  domain,
  issuer,
  clientId,
  redirectUri,
  scope = "openid",
  ...events
}) => (
  <OIDCProvider
    authority={domain}
    metadata={{
      issuer: issuer || `https://${domain}/`,
      authorization_endpoint: `https://${domain}/oauth2/authorize`,
      token_endpoint: `https://${domain}/oauth2/token`,
      end_session_endpoint: `https://${domain}/logout`,
    }}
    client_id={clientId}
    scope={scope}
    response_type="code"
    loadUserInfo={false}
    automaticSilentRenew
    redirect_uri={redirectUri}
    post_logout_redirect_uri={redirectUri}
    {...events}
  >
    {children}
  </OIDCProvider>
);

const useCongito = (): Omit<OIDCProviderState, "client"> => {
  const client = useAuthClient();
  const state = useAuth();
  return useMemo(
    () => ({
      ...state,
      logout: (opt?: LogoutOptions) =>
        state.logout({
          ...opt,
          extraQueryParams: {
            client_id: client.settings.client_id,
            response_type: client.settings.response_type,
            redirect_uri: client.settings.redirect_uri,
          },
        }),
    }),
    [state, client],
  );
};

export { CognitoProvider, useCongito };
