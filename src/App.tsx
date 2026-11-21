import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppStoreProvider } from "@/hooks/useAppStore";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { AppShell } from "@/components/layout/AppShell";

const Home = lazy(() => import("@/pages/marketing/Home"));
const Features = lazy(() => import("@/pages/marketing/Features"));
const Solutions = lazy(() => import("@/pages/marketing/Solutions"));
const HowItWorks = lazy(() => import("@/pages/marketing/HowItWorks"));
const Pricing = lazy(() => import("@/pages/marketing/Pricing"));
const About = lazy(() => import("@/pages/marketing/About"));
const Contact = lazy(() => import("@/pages/marketing/Contact"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));

const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const ImportPage = lazy(() => import("@/pages/app/Import"));
const Catalogue = lazy(() => import("@/pages/app/Catalogue"));
const Matching = lazy(() => import("@/pages/app/Matching"));
const Normalization = lazy(() => import("@/pages/app/Normalization"));
const Discovery = lazy(() => import("@/pages/app/Discovery"));
const Forecasting = lazy(() => import("@/pages/app/Forecasting"));
const Reports = lazy(() => import("@/pages/app/Reports"));
const Architecture = lazy(() => import("@/pages/app/Architecture"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-steel-300 border-t-amber-500" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={200}>
        <ScrollToTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route index element={<Home />} />
              <Route path="features" element={<Features />} />
              <Route path="solutions" element={<Solutions />} />
              <Route path="how-it-works" element={<HowItWorks />} />
              <Route path="pricing" element={<Pricing />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
            </Route>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route
              path="app"
              element={
                <RequireAuth>
                  <AppStoreProvider>
                    <AppShell />
                  </AppStoreProvider>
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="catalogue" element={<Catalogue />} />
              <Route path="matching" element={<Matching />} />
              <Route path="normalization" element={<Normalization />} />
              <Route path="discovery" element={<Discovery />} />
              <Route path="forecasting" element={<Forecasting />} />
              <Route path="reports" element={<Reports />} />
              <Route path="architecture" element={<Architecture />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </AuthProvider>
  );
}
