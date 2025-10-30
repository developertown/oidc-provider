import { UserProfile } from "oidc-client-ts";
import { describe, expect, it } from "vitest";
import { error, initialize } from "../actions";
import reducer from "../reducer";
import { AuthState, initialState } from "../state";

describe("reducer", () => {
  describe("initialize action", () => {
    it("should set isAuthenticated to true and user when authenticated", () => {
      const mockUser = {
        sub: "user123",
        name: "Test User",
        email: "test@example.com",
      } as UserProfile;

      const state: AuthState = {
        ...initialState,
        isLoading: true,
      };

      const action = initialize({
        isAuthenticated: true,
        user: mockUser,
      });

      const newState = reducer(state, action);

      expect(newState.isAuthenticated).toBe(true);
      expect(newState.user).toEqual(mockUser);
      expect(newState.isLoading).toBe(false);
      expect(newState.error).toBeUndefined();
    });

    it("should set isAuthenticated to false and no user when not authenticated", () => {
      const state: AuthState = {
        ...initialState,
        isLoading: true,
      };

      const action = initialize({
        isAuthenticated: false,
      });

      const newState = reducer(state, action);

      expect(newState.isAuthenticated).toBe(false);
      expect(newState.user).toBeUndefined();
      expect(newState.isLoading).toBe(false);
      expect(newState.error).toBeUndefined();
    });

    it("should clear previous error when initializing", () => {
      const previousError = new Error("Previous error");
      const state: AuthState = {
        ...initialState,
        error: previousError,
        isLoading: true,
      };

      const action = initialize({
        isAuthenticated: false,
      });

      const newState = reducer(state, action);

      expect(newState.error).toBeUndefined();
      expect(newState.isLoading).toBe(false);
    });

    it("should preserve other state properties", () => {
      const state: AuthState = {
        ...initialState,
        isLoading: true,
      };

      const action = initialize({
        isAuthenticated: true,
      });

      const newState = reducer(state, action);

      expect(newState).toHaveProperty("isAuthenticated");
      expect(newState).toHaveProperty("isLoading");
      expect(newState).toHaveProperty("error");
      expect(newState).toHaveProperty("user");
    });
  });

  describe("error action", () => {
    it("should set error and stop loading", () => {
      const testError = new Error("Authentication failed");
      const state: AuthState = {
        ...initialState,
        isLoading: true,
      };

      const action = error(testError);
      const newState = reducer(state, action);

      expect(newState.error).toEqual(testError);
      expect(newState.isLoading).toBe(false);
    });

    it("should preserve isAuthenticated and user when error occurs", () => {
      const mockUser: UserProfile = {
        sub: "user123",
        name: "Test User",
      } as UserProfile;

      const state: AuthState = {
        ...initialState,
        isAuthenticated: true,
        user: mockUser,
        isLoading: true,
      };

      const testError = new Error("Token refresh failed");
      const action = error(testError);
      const newState = reducer(state, action);

      expect(newState.error).toEqual(testError);
      expect(newState.isLoading).toBe(false);
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.user).toEqual(mockUser);
    });

    it("should replace previous error with new error", () => {
      const previousError = new Error("Previous error");
      const newError = new Error("New error");

      const state: AuthState = {
        ...initialState,
        error: previousError,
        isLoading: true,
      };

      const action = error(newError);
      const newState = reducer(state, action);

      expect(newState.error).toEqual(newError);
      expect(newState.error).not.toEqual(previousError);
      expect(newState.isLoading).toBe(false);
    });

    it("should handle error with custom properties", () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public code: string,
        ) {
          super(message);
          this.name = "CustomError";
        }
      }

      const customError = new CustomError("Custom auth error", "AUTH_001");
      const state: AuthState = {
        ...initialState,
        isLoading: true,
      };

      const action = error(customError);
      const newState = reducer(state, action);

      expect(newState.error).toEqual(customError);
      expect((newState.error as CustomError).code).toBe("AUTH_001");
      expect(newState.isLoading).toBe(false);
    });
  });

  describe("state immutability", () => {
    it("should not mutate the original state on initialize", () => {
      const state: AuthState = {
        ...initialState,
        isLoading: true,
      };

      const originalState = { ...state };
      const action = initialize({ isAuthenticated: true });

      reducer(state, action);

      expect(state).toEqual(originalState);
    });

    it("should not mutate the original state on error", () => {
      const state: AuthState = {
        ...initialState,
        isLoading: true,
      };

      const originalState = { ...state };
      const testError = new Error("Test error");
      const action = error(testError);

      reducer(state, action);

      expect(state).toEqual(originalState);
    });
  });
});
