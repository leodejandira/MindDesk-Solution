import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore no celular; localStorage só no web (usado para testes no navegador).
const web = Platform.OS === "web";

export const storage = {
  get: (k: string): Promise<string | null> =>
    web ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k),
  set: (k: string, v: string): Promise<void> =>
    web ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v),
  del: (k: string): Promise<void> =>
    web ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k),
};
