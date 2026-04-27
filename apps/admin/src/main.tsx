import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3100";

type Merchant = { id: string; displayName: string; primaryDomain: string; enabled: boolean; region: string };
type Submission = { id: string; code: string; status: string; region: string; createdAt: string };
type Attempt = { id: string; result: string; region: string; savingsMinor?: number; createdAt: string };
type WorkerJob = { id: string; jobName: string; status: string; createdAt: string };

function App() {
  const [token, setToken] = useState(localStorage.getItem("trustCouponsAdminToken") ?? "");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
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
    const [merchantData, submissionData, attemptData, jobData] = await Promise.all([
      api("/api/admin/merchants"),
      api("/api/admin/submissions"),
      api("/api/admin/attempts"),
      api("/api/admin/jobs")
    ]);
    setMerchants(merchantData.merchants);
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
