import { forwardRef } from "react";
import logo from "@/assets/occu-med-logo.png";
import { documentTitle, SERVICE_AGREEMENT_SECTIONS } from "@/lib/providerDocuments";
import type { ProviderDocumentData, ProviderServiceRow } from "@/types/memo";

interface Props {
  data: ProviderDocumentData;
  invitationStatus?: string;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function addressLines(data: ProviderDocumentData) {
  return [
    data.address.street1,
    data.address.street2,
    [data.address.city, data.address.state, data.address.zip].filter(Boolean).join(", "),
  ].filter(Boolean);
}

function splitServices(data: ProviderDocumentData): ProviderServiceRow[][] {
  const rows = data.services.filter((row) => row.component.trim() || row.price.trim());
  const finalCapacity = data.documentType === "service-agreement" ? 7 : 14;
  if (rows.length <= finalCapacity) return [rows];

  const pages: ProviderServiceRow[][] = [];
  let remaining = rows;
  while (remaining.length > finalCapacity) {
    const take = Math.min(18, remaining.length - finalCapacity);
    pages.push(remaining.slice(0, take));
    remaining = remaining.slice(take);
  }
  pages.push(remaining);
  return pages;
}

export const ProviderDocumentPreview = forwardRef<HTMLDivElement, Props>(
  ({ data, invitationStatus }, ref) => {
    const servicePages = splitServices(data);
    const address = addressLines(data);

    return (
      <div ref={ref} className="provider-document-preview" aria-label={`${documentTitle(data.documentType)} PDF preview`}>
        {servicePages.map((services, pageIndex) => {
          const firstPage = pageIndex === 0;
          const finalPage = pageIndex === servicePages.length - 1;
          return (
            <section className="provider-document-page" data-pdf-page key={`${pageIndex}-${services[0]?.id || "empty"}`}>
              <header className="provider-document-header">
                <img src={logo} alt="Occu-Med" />
                <div>
                  <div className="provider-document-company">Occu-Med, LTD</div>
                  <h2>{documentTitle(data.documentType)}</h2>
                </div>
                <div className="provider-document-number">
                  <span>Document</span>
                  <strong>{data.documentNumber || "—"}</strong>
                  {invitationStatus && <em>{invitationStatus}</em>}
                </div>
              </header>

              {firstPage && (
                <>
                  <div className="provider-document-meta">
                    <div>
                      <span>Prepared for</span>
                      <strong>{data.providerName || "Provider / Facility"}</strong>
                      <p>{data.providerContactName || "Provider contact"}</p>
                      {address.length ? address.map((line) => <p key={line}>{line}</p>) : <p>Provider address</p>}
                      <p>{[data.providerPhone, data.providerEmail].filter(Boolean).join(" · ") || "Provider contact details"}</p>
                    </div>
                    <dl>
                      <div><dt>Issued</dt><dd>{formatDate(data.issuedDate)}</dd></div>
                      <div><dt>Valid through</dt><dd>{formatDate(data.expiresDate)}</dd></div>
                      <div><dt>Billing terms</dt><dd>{data.billingTerms || "—"}</dd></div>
                      <div><dt>Prepared by</dt><dd>{data.preparedBy || "—"}{data.preparedByTitle ? `, ${data.preparedByTitle}` : ""}</dd></div>
                    </dl>
                  </div>

                  <div className="provider-document-intro">
                    {data.documentType === "fee-proposal"
                      ? "Occu-Med proposes the following fees for the occupational health services listed below. The provider may review the proposal, remove services that are not available, and add services it would like Occu-Med to consider."
                      : "This agreement records the services, fees, and operating terms accepted by Occu-Med and the provider. Only services authorized by Occu-Med for a specific referral may be performed and invoiced."
                    }
                  </div>
                </>
              )}

              <div className="provider-document-section-heading">
                <span>{firstPage ? "Services and agreed fees" : "Services and agreed fees — continued"}</span>
                <span>{pageIndex + 1} / {servicePages.length}</span>
              </div>
              <table className="provider-document-services">
                <thead>
                  <tr>
                    <th>Service / Exam Component</th>
                    <th>Fee</th>
                    <th>Added by</th>
                  </tr>
                </thead>
                <tbody>
                  {services.length ? services.map((row) => (
                    <tr key={row.id}>
                      <td>{row.component || "—"}</td>
                      <td>{row.price || "—"}</td>
                      <td>{row.source === "provider" ? "Provider" : "Occu-Med"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="provider-document-empty">No services have been added.</td></tr>
                  )}
                </tbody>
              </table>

              {finalPage && data.notes && (
                <div className="provider-document-notes">
                  <strong>Notes</strong>
                  <p>{data.notes}</p>
                </div>
              )}

              {finalPage && data.documentType === "service-agreement" && (
                <div className="provider-document-terms">
                  {SERVICE_AGREEMENT_SECTIONS.map((section) => (
                    <div key={section.title}>
                      <strong>{section.title}</strong>
                      <p>{section.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {finalPage && (
                <div className="provider-document-signature">
                  <div>
                    <span>For Occu-Med</span>
                    <strong>{data.preparedBy || "Pending"}</strong>
                    <p>{data.preparedByTitle || "Network Management"}</p>
                    <p>{formatDate(data.issuedDate)}</p>
                  </div>
                  <div>
                    <span>Provider acceptance</span>
                    <strong className={data.providerSignerName ? "signature-name" : ""}>
                      {data.providerSignerName || "Pending provider signature"}
                    </strong>
                    <p>{data.providerSignerTitle || "Title"}</p>
                    <p>{formatDate(data.providerSignedDate)}</p>
                  </div>
                </div>
              )}

              <footer>
                <span>Occu-Med · Provider Network Management</span>
                <span>{data.documentNumber || "Draft"}</span>
              </footer>
            </section>
          );
        })}
      </div>
    );
  },
);

ProviderDocumentPreview.displayName = "ProviderDocumentPreview";
