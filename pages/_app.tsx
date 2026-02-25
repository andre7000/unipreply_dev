import "@/styles/globals.css";
import "@/config/firebaseConfig";
import type { AppProps } from "next/app";
import { AuthProvider } from "@/context/AuthContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Component {...pageProps} />
      </WorkspaceProvider>
    </AuthProvider>
  );
}
