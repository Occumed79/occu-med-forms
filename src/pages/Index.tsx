import { lazy, Suspense, useState } from "react";
import { FloatingFormSelector, type FormVariant } from "@/components/memo/FloatingFormSelector";

const FeeProposalForm = lazy(() => import("@/components/memo/FeeProposalForm").then((module) => ({ default: module.FeeProposalForm })));
const NetworkMemoForm = lazy(() => import("@/components/memo/NetworkMemoForm").then((module) => ({ default: module.NetworkMemoForm })));
const SignedClinicMemoForm = lazy(() => import("@/components/memo/SignedClinicMemoForm").then((module) => ({ default: module.SignedClinicMemoForm })));
const ProviderAgreementForm = lazy(() => import("@/components/memo/ProviderAgreementForm").then((module) => ({ default: module.ProviderAgreementForm })));
const ContactSheetForm = lazy(() => import("@/components/memo/ContactSheetForm").then((module) => ({ default: module.ContactSheetForm })));

const Index = () => {
  const [variant, setVariant] = useState<FormVariant>("fee-proposal");

  return (
    <main className="min-h-screen py-7 px-4 pb-24">
      <h1 className="sr-only">Occu-Med Pricing Memo</h1>
      <Suspense fallback={<div className="mx-auto max-w-[1200px] rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">Loading form…</div>}>
        {variant === "fee-proposal" && <FeeProposalForm />}
        {variant === "network" && <NetworkMemoForm />}
        {variant === "clinic-signed" && <SignedClinicMemoForm />}
        {variant === "provider-agreement-terms" && <ProviderAgreementForm includeTermsBlock />}
        {variant === "occu-contact-sheet" && <ContactSheetForm kind="occu" />}
        {variant === "provider-contact-sheet" && <ContactSheetForm kind="provider" />}
      </Suspense>
      <FloatingFormSelector variant={variant} onSelect={setVariant} />
    </main>
  );
};

export default Index;
