import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/Toaster";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProtectedRoute } from "@/lib/auth/ProtectedRoute";
import { SetupGate } from "@/lib/auth/SetupGate";
import { ApiError } from "@/lib/api/client";
import { Dashboard } from "@/pages/Dashboard";
import { Logs } from "@/pages/Logs";
import { Login } from "@/pages/Login";
import { NotFound } from "@/pages/NotFound";
import { Setup } from "@/pages/Setup";
import { Settings } from "@/pages/Settings";
import { Whitelist } from "@/pages/Whitelist";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 60 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry auth / authorization / 4xx — they aren't transient.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

export function App() {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SetupGate>
            <Routes>
              <Route path="/setup" element={<Setup />} />
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="whitelist" element={<Whitelist />} />
                  <Route path="logs" element={<Logs />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SetupGate>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
