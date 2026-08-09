import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import logo from "@/assets/occu-med-logo.png";
import { apiVerifyCertificate } from "@/lib/backend";
import { adminDocumentLabel, formatAdminDate } from "@/lib/adminInvitations";
import type { CertificateVerification } from "@/types/memo";

export default function VerifyCertificatePage() {
  const { evidenceHash = "" } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(evidenceHash);
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!evidenceHash) { setResult(null); return; }
    let active = true;
    setLoading(true); setError(""); setCode(evidenceHash);
    apiVerifyCertificate(evidenceHash)
      .then((value) => { if (active) setResult(value); })
      .catch((requestError) => { if (active) { setResult(null); setError(requestError instanceof Error ? requestError.message : "Certificate verification failed."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [evidenceHash]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(normalized)) { setError("Enter the complete 64-character evidence code printed on the certificate."); return; }
    navigate(`/verify/${normalized}`);
  };

  return <main className="verification-shell">
    <section className="verification-card">
      <header><img src={logo} alt="Occu-Med" /><div><p>Document evidence</p><h1>Verify a completion certificate</h1></div></header>
      <form onSubmit={submit}><label htmlFor="evidence-code">Evidence SHA-256 code</label><div><input id="evidence-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Paste the code printed on the certificate" spellCheck={false} /><button type="submit" disabled={loading}>{loading ? "Checking…" : <><ShieldCheck size={17} /> Verify</>}</button></div></form>
      {error && <div className="verification-error" role="alert"><AlertTriangle size={19} /><div><strong>Could not verify</strong><p>{error}</p></div></div>}
      {result && <section className={`verification-result ${result.verified ? "verified" : "pending"}`}>
        <div className="verification-result-title">{result.verified ? <CheckCircle2 size={27} /> : <AlertTriangle size={27} />}<div><p>{result.verified ? "Authentic completion record" : "Record found, but not final"}</p><h2>{result.documentNumber}</h2></div></div>
        <dl><div><dt>Document</dt><dd>{adminDocumentLabel(result.documentType)}</dd></div><div><dt>Provider</dt><dd>{result.providerName}</dd></div><div><dt>Signer</dt><dd>{result.signerName}</dd></div><div><dt>Signed</dt><dd>{formatAdminDate(result.signedAt)}</dd></div><div><dt>Occu-Med approval</dt><dd>{result.approvedAt ? formatAdminDate(result.approvedAt) : "Not required or pending"}</dd></div><div><dt>Signature</dt><dd>{result.signatureType}</dd></div></dl>
        <div className="verification-check-grid">{Object.entries(result.checks).map(([label, valid]) => <span key={label} data-valid={valid === true}>{valid === true ? <FileCheck2 size={14} /> : <AlertTriangle size={14} />}{label.replace(/([A-Z])/g, " $1")}</span>)}</div>
        <div className="verification-hashes"><p><strong>Final PDF</strong>{result.finalPdfHash}</p><p><strong>Evidence</strong>{result.evidenceHash}</p></div>
      </section>}
      {!result && !error && !loading && <div className="verification-empty"><FileCheck2 size={26} /><p>Paste the evidence code from an Occu-Med Certificate of Completion.</p><span>The verification checks the original document, signed PDF, signature evidence, and audit-event chain.</span></div>}
      <footer><span>Occu-Med Provider Documents</span><a href="https://www.occu-med.com" target="_blank" rel="noreferrer">Occu-Med website <ArrowRight size={13} /></a></footer>
    </section>
  </main>;
}
