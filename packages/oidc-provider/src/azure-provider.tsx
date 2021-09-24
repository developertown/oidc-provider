import React from "react";
import { OIDCProvider, useAuth as useAzure } from "./oidc-provider";
import { AuthProviderOptions } from "./auth-provider";
import { getUniqueScopes } from "./utils";

export type AzureProviderOptions = AuthProviderOptions & {
  policy: string;
};

const AzureProvider: React.FC<AzureProviderOptions> = ({
  children,
  domain,
  issuer,
  clientId,
  clientSecret,
  redirectUri,
  useRefreshTokens = false,
  scope = "openid email profile",
  policy,
  ...props
}) => (
  <OIDCProvider
    authority={domain}
    metadata={{
      issuer: issuer || `https://${domain}/`,
      authorization_endpoint: `https://${domain}/${policy}/oauth2/v2.0/authorize`,
      token_endpoint: `https://${domain}/${policy}/oauth2/v2.0/token`,
      end_session_endpoint: `https://${domain}/${policy}/oauth2/v2.0/logout`,
    }}
    client_id={clientId}
    client_secret={clientSecret}
    scope={getUniqueScopes(scope, useRefreshTokens ? "offline_access" : "")}
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

export { AzureProvider, useAzure };
