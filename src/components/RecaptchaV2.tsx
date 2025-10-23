import React, { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

const SITE_KEY_TEST = "your-site-key";

export const RecaptchaV2 = () => {
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") || "";

    const token = recaptchaRef.current?.getValue();
    if (!token) {
       setMsg("⚠️ reCAPTCHA not ready");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/submit-with-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, token }),
      });

      const j = await res.json();
      console.log("🔍 reCAPTCHA result：", j);
      setMsg(JSON.stringify(j, null, 2));
    } catch (err) {
      console.error("request error：", err);
      setMsg(`❌ request error：${String(err)}`);
    } finally {
      recaptchaRef.current?.reset();
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>With reCAPTCHA</h2>

      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input name="name" style={{ marginLeft: 8 }} />
        </label>

        <div style={{ marginTop: 12 }}>
          <ReCAPTCHA ref={recaptchaRef} sitekey={SITE_KEY_TEST} />
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="submit">Submit</button>
        </div>
      </form>

      <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{msg}</pre>
    </div>
  );
};
