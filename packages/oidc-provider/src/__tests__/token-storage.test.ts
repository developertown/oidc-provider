import { InMemoryWebStorage } from "oidc-client-ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import tokenStorageForType, { StorageTypes, TokenStorage } from "../token-storage";

describe("tokenStorageForType", () => {
  beforeEach(() => {
    // Clear any mocks before each test
    vi.clearAllMocks();
  });

  describe("StorageTypes.LocalStorage", () => {
    it("should return window.localStorage when passed LocalStorage type", () => {
      const storage = tokenStorageForType(StorageTypes.LocalStorage);
      expect(storage).toBe(globalThis.localStorage);
    });

    it("should return a Storage instance", () => {
      const storage = tokenStorageForType(StorageTypes.LocalStorage);
      expect(storage).toHaveProperty("getItem");
      expect(storage).toHaveProperty("setItem");
      expect(storage).toHaveProperty("removeItem");
      expect(storage).toHaveProperty("clear");
    });
  });

  describe("StorageTypes.SessionStorage", () => {
    it("should return window.sessionStorage when passed SessionStorage type", () => {
      const storage = tokenStorageForType(StorageTypes.SessionStorage);
      expect(storage).toBe(globalThis.sessionStorage);
    });

    it("should return a Storage instance", () => {
      const storage = tokenStorageForType(StorageTypes.SessionStorage);
      expect(storage).toHaveProperty("getItem");
      expect(storage).toHaveProperty("setItem");
      expect(storage).toHaveProperty("removeItem");
      expect(storage).toHaveProperty("clear");
    });
  });

  describe("StorageTypes.MemoryStorage", () => {
    it("should return an InMemoryWebStorage instance when passed MemoryStorage type", () => {
      const storage = tokenStorageForType(StorageTypes.MemoryStorage);
      expect(storage).toBeInstanceOf(InMemoryWebStorage);
    });

    it("should return a Storage instance with all required methods", () => {
      const storage = tokenStorageForType(StorageTypes.MemoryStorage);
      expect(storage).toHaveProperty("getItem");
      expect(storage).toHaveProperty("setItem");
      expect(storage).toHaveProperty("removeItem");
      expect(storage).toHaveProperty("clear");
      expect(storage).toHaveProperty("key");
      expect(storage).toHaveProperty("length");
    });

    it("should return a new instance each time", () => {
      const storage1 = tokenStorageForType(StorageTypes.MemoryStorage);
      const storage2 = tokenStorageForType(StorageTypes.MemoryStorage);
      expect(storage1).not.toBe(storage2);
    });

    it("should allow storing and retrieving values", () => {
      const storage = tokenStorageForType(StorageTypes.MemoryStorage);
      storage.setItem("testKey", "testValue");
      expect(storage.getItem("testKey")).toBe("testValue");
    });

    it("should allow removing values", () => {
      const storage = tokenStorageForType(StorageTypes.MemoryStorage);
      storage.setItem("testKey", "testValue");
      storage.removeItem("testKey");
      expect(storage.getItem("testKey")).toBeUndefined();
    });

    it("should allow clearing all values", () => {
      const storage = tokenStorageForType(StorageTypes.MemoryStorage);
      storage.setItem("key1", "value1");
      storage.setItem("key2", "value2");
      storage.clear();
      expect(storage.length).toBe(0);
      expect(storage.getItem("key1")).toBeUndefined();
      expect(storage.getItem("key2")).toBeUndefined();
    });
  });

  describe("Custom Storage", () => {
    it("should return the custom storage instance when passed a Storage object", () => {
      const customStorage: TokenStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      };

      const storage = tokenStorageForType(customStorage);
      expect(storage).toBe(customStorage);
    });

    it("should work with a custom storage implementation", () => {
      const mockGetItem = vi.fn().mockReturnValue("customValue");
      const mockSetItem = vi.fn();
      const mockRemoveItem = vi.fn();
      const mockClear = vi.fn();

      const customStorage: TokenStorage = {
        getItem: mockGetItem,
        setItem: mockSetItem,
        removeItem: mockRemoveItem,
        clear: mockClear,
        key: vi.fn(),
        length: 0,
      };

      const storage = tokenStorageForType(customStorage);

      storage.getItem("testKey");
      expect(mockGetItem).toHaveBeenCalledWith("testKey");

      storage.setItem("testKey", "testValue");
      expect(mockSetItem).toHaveBeenCalledWith("testKey", "testValue");

      storage.removeItem("testKey");
      expect(mockRemoveItem).toHaveBeenCalledWith("testKey");

      storage.clear();
      expect(mockClear).toHaveBeenCalled();
    });
  });
});
