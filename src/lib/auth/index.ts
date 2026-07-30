import { ortam } from "../ortam";
import { EbaAuthProvider } from "./eba-provider";
import { MockAuthProvider } from "./mock-provider";
import type { AuthProvider } from "./tipler";

let saglayici: AuthProvider | null = null;

/**
 * Yapılandırmaya göre kimlik sağlayıcısını döndürür. Uygulamanın geri kalanı
 * hangi sağlayıcının etkin olduğunu bilmez.
 */
export function authProvider(): AuthProvider {
  if (!saglayici) {
    saglayici =
      ortam.AUTH_PROVIDER === "eba"
        ? new EbaAuthProvider()
        : new MockAuthProvider();
  }
  return saglayici;
}

export type { AuthKimlik, AuthProvider, KimlikTipi } from "./tipler";
