import withAuthenticationRequired, { WithAuthenticationRequiredOptions } from "./with-authentication-required";
import { TokenStorage } from "./token-storage";

export { Auth0Provider, useAuth0 } from "./auth0-provider";
export { AzureProvider, useAzure } from "./azure-provider";
export { CognitoProvider, useCongito } from "./cognito-provider";
export { OIDCProvider, useAuth } from "./oidc-provider";
export type { Token } from "./oidc-provider";
export { StorageTypes } from "./token-storage";
export type { TokenStorage };
export { withAuthenticationRequired };
export type { WithAuthenticationRequiredOptions };
