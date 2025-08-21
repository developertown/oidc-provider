import { describe, it, expect } from 'vitest';

describe('Environment Variables', () => {
  it('should load VITE_ prefixed environment variables', () => {
    // Test that Vite environment variables are accessible
    expect(import.meta.env).toBeDefined();
    
    // Test that we can access VITE_ prefixed variables
    // Note: In test environment, we can check that the structure exists
    expect(typeof import.meta.env.VITE_AUTH0_DOMAIN).toBe('string');
    expect(typeof import.meta.env.VITE_AUTH0_AUDIENCE).toBe('string');
    expect(typeof import.meta.env.VITE_AUTH0_CLIENT_ID).toBe('string');
  });

  it('should have correct environment variable values in test mode', () => {
    // In our .env file we set these test values
    expect(import.meta.env.VITE_AUTH0_DOMAIN).toBe('dev-example.auth0.com');
    expect(import.meta.env.VITE_AUTH0_AUDIENCE).toBe('https://api.example.com');
    expect(import.meta.env.VITE_AUTH0_CLIENT_ID).toBe('test_client_id_123');
  });
});