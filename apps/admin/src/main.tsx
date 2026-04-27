import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3100";

type Merchant = { id: string; displayName: string; primaryDomain: string; enabled: boolean; region: string };
type Coupon = {
  id: string;
  merchantId: string;
  region: string;
  code: string;
  title: string;
  status: string;
  source: string;
  sourceConfidence: number;
  currency: string;
  sourceUrl?: string | null;
  merchantConstraints: string[];
};
type Submission = { id: string; code: string; status: string; region: string; createdAt: string };
type Attempt = { id: string; result: string; region: string; savingsMinor?: number; createdAt: string };
type WorkerJob = { id: string; jobName: string; status: string; createdAt: string };

const defaultCouponForm = {
  merchantId: "",
  region: "CZ",
  code: "",
  title: "",
  status: "active",
  source: "curated",
  sourceConfidence: "0.7",
  currency: "CZK",
  sourceUrl: "",
  merchantConstraints: ""
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("trustCouponsAdminToken") ?? "");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
  const [couponForm, setCouponForm] = useState(defaultCouponForm);
  const [status, setStatus] = useState("Idle");

  async function api(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (token) headers.set("x-admin-token", token);
    if (init.body) headers.set("content-type", "application/json");
    const response = await fetch(`${apiBase}${path}`, { ...init, headers });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  async function load() {
    setStatus("Loading");
    localStorage.setItem("trustCouponsAdminToken", token);
    const [merchantData, couponData, submissionData, attemptData, jobData] = await Promise.all([
      api("/api/admin/merchants"),
      api("/api/admin/coupons"),
      api("/api/admin/submissions"),
      api("/api/admin/attempts"),
      api("/api/admin/jobs")
    ]);
    setMerchants(merchantData.merchants);
    setCoupons(couponData.coupons);
    setSubmissions(submissionData.submissions);
    setAttempts(attemptData.attempts);
    setJobs(jobData.jobs);
    setStatus("Loaded");
  }

  async function toggleMerchant(merchant: Merchant) {
    await api(`/api/admin/merchants/${merchant.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !merchant.enabled })
    });
    await load();
  }

  async function reviewSubmission(submission: Submission, nextStatus: "approved" | "rejected") {
    await api(`/api/admin/submissions/${submission.id}/review`, {
      method: "POST",
      body: JSON.stringify({ status: nextStatus })
    });
    await load();
  }

  async function saveCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const merchant = merchants.find((item) => item.id === couponForm.merchantId);
    if (!merchant) {
      setStatus("Choose a merchant before saving");
      return;
    }
    await api("/api/admin/coupons", {
      method: "POST",
      body: JSON.stringify({
        id: crypto.randomUUID(),
        merchantId: couponForm.merchantId,
        region: couponForm.region,
        code: couponForm.code.trim(),
        title: couponForm.title.trim(),
        status: couponForm.status,
        source: couponForm.source,
        sourceConfidence: Number(couponForm.sourceConfidence),
        currency: couponForm.currency.toUpperCase(),
        sourceUrl: couponForm.sourceUrl.trim() || null,
        merchantConstraints: couponForm.merchantConstraints
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });
    setCouponForm({ ...defaultCouponForm, merchantId: merchant.id, region: merchant.region, currency: merchant.region === "EU" ? "EUR" : "CZK" });
    await load();
  }

  async function triggerJob(jobName: string) {
    await api(`/api/admin/jobs/${jobName}`, { method: "POST", body: JSON.stringify({}) });
    setStatus(`Queued ${jobName}`);
  }

  useEffect(() => {
    if (token) void load().catch((error) => setStatus(error.message));
  }, []);

  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">Trust Coupons</p>
          <h1>Admin Moderation</h1>
        </div>
        <div className="auth">
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Admin token or Cloudflare Access"
            type="password"
          />
          <button onClick={() => void load()}>Refresh</button>
        </div>
      </header>
      <p className="status">{status}</p>

      <section>
        <h2>Merchants</h2>
        <div className="grid">
          {merchants.map((merchant) => (
            <article key={merchant.id}>
              <strong>{merchant.displayName}</strong>
              <span>{merchant.primaryDomain} · {merchant.region}</span>
              <button onClick={() => void toggleMerchant(merchant)}>{merchant.enabled ? "Disable" : "Enable"}</button>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Coupons</h2>
        <form className="coupon-form" onSubmit={(event) => void saveCoupon(event)}>
          <select
            value={couponForm.merchantId}
            onChange={(event) => {
              const merchant = merchants.find((item) => item.id === event.target.value);
              setCouponForm({
                ...couponForm,
                merchantId: event.target.value,
                region: merchant?.region ?? couponForm.region,
                currency: merchant?.region === "EU" ? "EUR" : "CZK"
              });
            }}
            required
          >
            <option value="">Merchant</option>
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>{merchant.displayName}</option>
            ))}
          </select>
          <input value={couponForm.code} onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value })} placeholder="Code" required />
          <input value={couponForm.title} onChange={(event) => setCouponForm({ ...couponForm, title: event.target.value })} placeholder="Title" required />
          <select value={couponForm.region} onChange={(event) => setCouponForm({ ...couponForm, region: event.target.value })}>
            <option value="CZ">CZ</option>
            <option value="EU">EU</option>
            <option value="US">US</option>
          </select>
          <select value={couponForm.status} onChange={(event) => setCouponForm({ ...couponForm, status: event.target.value })}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={couponForm.source} onChange={(event) => setCouponForm({ ...couponForm, source: event.target.value })}>
            <option value="curated">Curated</option>
            <option value="community">Community</option>
            <option value="affiliate">Affiliate</option>
            <option value="partner_feed">Partner feed</option>
          </select>
          <input
            value={couponForm.sourceConfidence}
            onChange={(event) => setCouponForm({ ...couponForm, sourceConfidence: event.target.value })}
            type="number"
            min="0"
            max="1"
            step="0.05"
            aria-label="Source confidence"
          />
          <input value={couponForm.currency} onChange={(event) => setCouponForm({ ...couponForm, currency: event.target.value })} placeholder="Currency" required />
          <input value={couponForm.sourceUrl} onChange={(event) => setCouponForm({ ...couponForm, sourceUrl: event.target.value })} placeholder="Source URL" />
          <textarea
            value={couponForm.merchantConstraints}
            onChange={(event) => setCouponForm({ ...couponForm, merchantConstraints: event.target.value })}
            placeholder="One constraint per line"
          />
          <button type="submit">Save Coupon</button>
        </form>
        <div className="table">
          {coupons.slice(0, 20).map((coupon) => (
            <div className="row coupon-row" key={coupon.id}>
              <span>{coupon.code}</span>
              <span>{merchants.find((merchant) => merchant.id === coupon.merchantId)?.displayName ?? coupon.merchantId}</span>
              <span>{coupon.status} · {coupon.region}</span>
              <span>{coupon.source} · {Math.round(coupon.sourceConfidence * 100)}%</span>
              <span>{coupon.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Submissions</h2>
        <div className="table">
          {submissions.map((submission) => (
            <div className="row" key={submission.id}>
              <span>{submission.code}</span>
              <span>{submission.status}</span>
              <span>{submission.region}</span>
              <button onClick={() => void reviewSubmission(submission, "approved")}>Approve</button>
              <button onClick={() => void reviewSubmission(submission, "rejected")}>Reject</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Workers</h2>
        <div className="actions">
          {["coupon-feed-import", "coupon-verification", "merchant-health-check", "telemetry-aggregation", "data-retention-cleanup", "backup-verification"].map((job) => (
            <button key={job} onClick={() => void triggerJob(job)}>{job}</button>
          ))}
        </div>
        <div className="table">
          {jobs.map((job) => (
            <div className="row" key={job.id}>
              <span>{job.jobName}</span>
              <span>{job.status}</span>
              <span>{new Date(job.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Recent Attempts</h2>
        <div className="table">
          {attempts.map((attempt) => (
            <div className="row" key={attempt.id}>
              <span>{attempt.result}</span>
              <span>{attempt.region}</span>
              <span>{attempt.savingsMinor ?? 0}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
