import { InMemoryWebStorage } from "oidc-client";

export type TokenStorage = Omit<Storage, "clear">;
export enum StorageTypes {
  LocalStorage = "localStorage",
  SessionStorage = "sessionStorage",
  MemoryStorage = "memoryStorage",
}
export type StorageType =
  | StorageTypes.LocalStorage
  | StorageTypes.SessionStorage
  | StorageTypes.MemoryStorage
  | TokenStorage;

const tokenStorageForType = (storageType: StorageType): TokenStorage => {
  switch (storageType) {
    case StorageTypes.LocalStorage:
      return window.localStorage;
    case StorageTypes.SessionStorage:
      return window.sessionStorage;
    case StorageTypes.MemoryStorage:
      return new InMemoryWebStorage();
    default:
      return storageType;
  }
};

export default tokenStorageForType;
