import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboard.tsx"));
const AdminDocumentComposerPage = lazy(() => import("./pages/AdminDocumentComposer.tsx"));
const AdminInvitationDetailPage = lazy(() => import("./pages/AdminInvitationDetail.tsx"));
const AdminLoginPage = lazy(() => import("./pages/AdminLogin.tsx"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsers.tsx"));
const AdminGovernancePage = lazy(() => import("./pages/AdminGovernance.tsx"));
const AdminAccountPage = lazy(() => import("./pages/AdminAccount.tsx"));
const ProviderInvitationPage = lazy(() => import("./pages/ProviderInvitation.tsx"));
const VerifyCertificatePage = lazy(() => import("./pages/VerifyCertificate.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/login" element={<Suspense fallback={<main className="admin-auth-shell">Loading…</main>}><AdminLoginPage /></Suspense>} />
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Suspense fallback={<main className="admin-main">Loading invitations…</main>}><AdminDashboardPage /></Suspense>} />
              <Route path="documents/new/:documentType" element={<Suspense fallback={<main className="admin-main">Loading document builder…</main>}><AdminDocumentComposerPage /></Suspense>} />
              <Route path="invitations/:id" element={<Suspense fallback={<main className="admin-main">Loading invitation…</main>}><AdminInvitationDetailPage /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<main className="admin-main">Loading accounts…</main>}><AdminUsersPage /></Suspense>} />
              <Route path="governance" element={<Suspense fallback={<main className="admin-main">Loading governance…</main>}><AdminGovernancePage /></Suspense>} />
              <Route path="account" element={<Suspense fallback={<main className="admin-main">Loading account…</main>}><AdminAccountPage /></Suspense>} />
              <Route path="forms" element={<Index />} />
            </Route>
          </Route>
          <Route path="/provider/:token" element={<Suspense fallback={<main className="provider-invite-shell">Loading provider document…</main>}><ProviderInvitationPage /></Suspense>} />
          <Route path="/verify/:evidenceHash?" element={<Suspense fallback={<main className="verification-shell">Loading verification…</main>}><VerifyCertificatePage /></Suspense>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
