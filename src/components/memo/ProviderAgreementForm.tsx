import { ProviderDocumentForm } from "./ProviderDocumentForm";

interface Props {
  includeTermsBlock?: boolean;
}

export const ProviderAgreementForm = (_props: Props) => (
  <ProviderDocumentForm documentType="service-agreement" />
);
