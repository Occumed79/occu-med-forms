import { forwardRef } from "react";
import { OccuMedFingerprintSeal } from "@/components/branding/OccuMedFingerprintSeal";
import { OccuMedLogo } from "@/components/branding/OccuMedLogo";
import {
  isContactHourField,
  isContactRoleField,
  occuMedContactSheetAttachment,
  providerContactSheetFields,
} from "@/lib/contactSheetAttachments";
import { documentTitle, SERVICE_AGREEMENT_SECTIONS } from "@/lib/providerDocuments";
import type { ContactSheetField, ProviderDocumentData, ProviderServiceRow } from "@/types/memo";

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
  if (data.documentType === "service-agreement") {
    if (rows.length <= 4) return [rows];
    const pages: ProviderServiceRow[][] = [rows.slice(0, 6)];
    let remaining = rows.slice(6);
    while (remaining.length > 7) {
      const take = Math.min(18, remaining.length - 7);
      pages.push(remaining.slice(0, take));
      remaining = remaining.slice(take);
    }
    pages.push(remaining);
    return pages;
  }

  const finalCapacity = 14;
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

function ContactSheetPage({ title, fields, documentNumber }: { title: string; fields: ContactSheetField[]; documentNumber: string }) {
  const general = fields.filter((field) => !isContactHourField(field.label) && !isContactRoleField(field.label));
  const hours = fields.filter((field) => isContactHourField(field.label));
  const contacts = fields.filter((field) => isContactRoleField(field.label));
  return (
    <section className="provider-document-page provider-contact-page" data-pdf-page>
      <header className="provider-document-header">
        <OccuMedLogo monochrome />
        <div><div className="provider-document-company">Occu-Med, LTD</div><h2>{title}</h2></div>
        <div className="provider-document-number"><span>Package</span><strong>{documentNumber || "—"}</strong></div>
      </header>
      <div className="contact-sheet-section">
        <h3>General information</h3>
        <dl className="contact-sheet-grid">
          {general.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value || "—"}</dd></div>)}
        </dl>
      </div>
      <div className="contact-sheet-section">
        <h3>Hours of operation</h3>
        <dl className="contact-hours-grid">
          {hours.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value || "—"}</dd></div>)}
        </dl>
      </div>
      <div className="contact-sheet-section contact-sheet-contacts">
        <h3>Points of contact</h3>
        <dl>
          {contacts.map((field) => (
            <div key={field.label}>
              <dt>{field.label.replace(" - Name | Title | Telephone | Email | Preferred Method", "").replace(" - Name | Title | Telephone | Email", "")}</dt>
              <dd>{field.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <footer><span>Occu-Med · Provider Network Management</span><span>{documentNumber || "Draft"}</span></footer>
    </section>
  );
}

export const ProviderDocumentPreview = forwardRef<HTMLDivElement, Props>(
  ({ data, invitationStatus }, ref) => {
    const servicePages = splitServices(data);
    const address = addressLines(data);
    const includedForms = data.includedForms || [];

    return (
      <div ref={ref} className="provider-document-preview" aria-label={`${documentTitle(data.documentType)} PDF preview`}>
        {servicePages.map((services, pageIndex) => {
          const firstPage = pageIndex === 0;
          const finalPage = pageIndex === servicePages.length - 1;
          return (
            <section className="provider-document-page" data-pdf-page key={`${pageIndex}-${services[0]?.id || "empty"}`}>
              <header className="provider-document-header">
                <OccuMedLogo monochrome />
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

                  {data.documentType === "service-agreement" && (
                    <div className="provider-document-terms-block">
                      <div className="provider-document-terms-heading">Agreement terms</div>
                      <div className="provider-document-terms">
                        {SERVICE_AGREEMENT_SECTIONS.map((section) => (
                          <div key={section.title}><strong>{section.title}</strong><p>{section.body}</p></div>
                        ))}
                      </div>
                    </div>
                  )}
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

              {finalPage && (
                <div className="provider-document-signature">
                  <div>
                    <span>For Occu-Med</span>
                    <OccuMedFingerprintSeal compact />
                    <strong>{data.preparedBy || "Pending"}</strong>
                    <p>{data.preparedByTitle || "Network Management"}</p>
                    <p>{formatDate(data.issuedDate)}</p>
                  </div>
                  <div>
                    <span>Provider acceptance</span>
                    {data.providerSignatureType === "drawn" && data.providerSignatureData ? (
                      <img className="provider-drawn-signature" src={data.providerSignatureData} alt={`Signature of ${data.providerSignerName}`} />
                    ) : (
                      <strong className={data.providerSignerName ? "signature-name" : ""}>
                        {data.providerSignerName || "Pending provider signature"}
                      </strong>
                    )}
                    {data.providerSignatureType === "drawn" && data.providerSignerName && <p>{data.providerSignerName}</p>}
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
        {includedForms.map((form) => form === "provider-contact-sheet" ? (
          <ContactSheetPage key={form} title="Provider Contact Information" fields={providerContactSheetFields(data)} documentNumber={data.documentNumber} />
        ) : (
          <ContactSheetPage
            key={form}
            title="Occu-Med Contact Information"
            fields={data.occuMedContactFields?.length ? data.occuMedContactFields : occuMedContactSheetAttachment().fields}
            documentNumber={data.documentNumber}
          />
        ))}
      </div>
    );
  },
);

ProviderDocumentPreview.displayName = "ProviderDocumentPreview";
