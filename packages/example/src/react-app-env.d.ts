/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Auth0 Configuration
  readonly VITE_AUTH0_DOMAIN: string
  readonly VITE_AUTH0_AUDIENCE: string
  readonly VITE_AUTH0_CLIENT_ID: string
  
  // Cognito Configuration
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_COGNITO_ISSUER: string
  readonly VITE_COGNITO_CLIENT_ID: string
  
  // Azure Configuration
  readonly VITE_AZURE_DOMAIN: string
  readonly VITE_AZURE_POLICY: string
  readonly VITE_AZURE_ISSUER: string
  readonly VITE_AZURE_CLIENT_ID: string
  readonly VITE_AZURE_CLIENT_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
