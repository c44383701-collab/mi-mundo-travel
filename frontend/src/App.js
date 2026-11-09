import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Show, useAuth } from "@clerk/react";
import { Toaster } from "sonner";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import AppShell from "@/components/AppShell";
import { Landing, SignInPage, SignUpPage } from "@/pages/Landing";
import HomePage from "@/pages/Home";
import Profile from "@/pages/Profile";
import TripDetail from "@/pages/TripDetail";
import CityDetail from "@/pages/CityDetail";
import MiMundo from "@/pages/MiMundo";
import CountryDetail from "@/pages/CountryDetail";
import ContinentDetail from "@/pages/ContinentDetail";
import Cities from "@/pages/Cities";
import Stats from "@/pages/Stats";
import Passport from "@/pages/Passport";
import Explore from "@/pages/Explore";
import Discover from "@/pages/Discover";
import PublicProfile from "@/pages/PublicProfile";
import { SharedCity, SharedTrip } from "@/pages/Shared";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

const CacheGuard = () => {
  const { userId, isLoaded } = useAuth();
  const prev = useRef(userId);
  useEffect(() => {
    if (isLoaded && prev.current !== userId) queryClient.clear();
    prev.current = userId;
  }, [userId, isLoaded]);
  return null;
};

const Protected = ({ children }) => (
  <>
    <Show when="signed-in">{children}</Show>
    <Show when="signed-out"><Navigate to="/sign-in" replace /></Show>
  </>
);

const PRIVATE = [
  ["/perfil", Profile], ["/viajes/:id", TripDetail], ["/ciudades", Cities], ["/ciudades/:id", CityDetail],
  ["/mundo", MiMundo], ["/mundo/pais/:code", CountryDetail], ["/mundo/continente/:key", ContinentDetail],
  ["/estadisticas", Stats], ["/pasaporte", Passport], ["/explorar", Explore], ["/descubrir", Discover],
];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClerkAuthProvider>
          <CacheGuard />
          <AppShell>
            <Routes>
              <Route path="/" element={<><Show when="signed-in"><HomePage /></Show><Show when="signed-out"><Landing /></Show></>} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
              {PRIVATE.map(([path, C]) => <Route key={path} path={path} element={<Protected><C /></Protected>} />)}
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/compartir/ciudad/:token" element={<SharedCity />} />
              <Route path="/compartir/viaje/:token" element={<SharedTrip />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </ClerkAuthProvider>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}

export default App;
