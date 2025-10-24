import React, { useRef, useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE;

export const Hcaptcha = () => {
  const hcaptchaRef = useRef<HCaptcha>(null);
  const [token, setToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") || "";

    if (!token) {
      setMsg("⚠️ please complete hCaptcha");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/submit-with-hcaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, token }),
      });
      const j = await res.json();
      setMsg(JSON.stringify(j, null, 2));
    } catch (err) {
      setMsg(`❌ request error: ${String(err)}`);
    } finally {
      hcaptchaRef.current?.resetCaptcha();
      setToken(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>With Hcaptcha</h2>
      <p>Hcaptcha Local Testing</p>

      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input name="name" style={{ marginLeft: 8 }} />
        </label>

        <div style={{ marginTop: 12 }}>
          <HCaptcha
            sitekey={HCAPTCHA_SITE_KEY}
            ref={hcaptchaRef}
            onVerify={setToken}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="submit">Submit</button>
        </div>
      </form>

      <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{msg}</pre>
    </div>
  );
};
