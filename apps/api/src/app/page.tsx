import Image from "next/image";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";

const DASHBOARD_URL = (process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000").replace(/\/$/, "");

const ENDPOINTS = [
  { method: "GET", path: "/actions.json", purpose: "Maps TidePay URLs to the Action API for Blink clients" },
  { method: "GET", path: "/api/actions/subscribe/<plan>", purpose: "Action metadata for a plan, read from chain" },
  {
    method: "POST",
    path: "/api/actions/subscribe/<plan>",
    purpose: "Body { account }. Returns a subscribe transaction for the wallet to sign",
  },
  { method: "GET", path: "/subscribe/<plan>", purpose: "Redirects a browser to the checkout page" },
];

export default function Home() {
  return (
    <main>
      <header>
        <div className="brand">
          <Image src="/blink-icon.svg" alt="" width={28} height={28} priority />
          TidePay
        </div>
        <h1>Actions API</h1>
        <p className="lead">
          Solana Actions for TidePay subscriptions. Paste a plan&apos;s Blink URL into a Blink client such as dial.to,
          or open its checkout page, to subscribe with one signature.
        </p>
      </header>

      <section>
        <h2>Endpoints</h2>
        <div className="table">
          <table>
            <thead>
              <tr>
                <th scope="col">Route</th>
                <th scope="col">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((endpoint) => (
                <tr key={`${endpoint.method} ${endpoint.path}`}>
                  <td>
                    <code>
                      <span className="method">{endpoint.method}</span>
                      {endpoint.path}
                    </code>
                  </td>
                  <td>{endpoint.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Network</h2>
        <dl className="facts">
          <dt>Cluster</dt>
          <dd>Solana Devnet</dd>
          <dt>Program</dt>
          <dd>
            <a href={`https://explorer.solana.com/address/${TIDEPAY_PROGRAM_ID}?cluster=devnet`}>
              <code>{TIDEPAY_PROGRAM_ID}</code>
            </a>
          </dd>
          <dt>Merchant console</dt>
          <dd>
            <a href={DASHBOARD_URL}>{DASHBOARD_URL.replace(/^https?:\/\//, "")}</a>
          </dd>
        </dl>
      </section>

      <footer>
        <code>&lt;plan&gt;</code> is the plan&apos;s on-chain address, shown in the merchant console.
      </footer>
    </main>
  );
}
