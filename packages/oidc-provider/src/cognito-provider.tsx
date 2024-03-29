import React, { useMemo } from "react";
import { OIDCProvider, useAuth, useAuthClient, LogoutOptions, AuthProviderState } from "./oidc-provider";
import { AuthProviderOptions } from "./auth-provider";
import { getUniqueScopes } from "./utils";

export type CognitoProviderOptions = AuthProviderOptions;

const CognitoProvider: React.FC<CognitoProviderOptions> = ({
  children,
  domain,
  issuer,
  clientId,
  clientSecret,
  redirectUri,
  useRefreshTokens = false,
  scope = "openid",
  ...props
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
    client_secret={clientSecret}
    scope={getUniqueScopes(scope)}
    response_type="code"
    loadUserInfo={false}
    automaticSilentRenew={useRefreshTokens}
    redirect_uri={redirectUri}
    post_logout_redirect_uri={redirectUri}
    {...props}
  >
    {children}
  </OIDCProvider>
);

const useCongito = (): AuthProviderState => {
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
            response_type: client.settings.response_type,
            redirect_uri: client.settings.redirect_uri,
          },
        }),
    }),
    [state, client],
  );
};

export { CognitoProvider, useCongito };
