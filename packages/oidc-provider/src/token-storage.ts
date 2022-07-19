import { InMemoryWebStorage } from "oidc-client-ts";

export type TokenStorage = Storage;
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
