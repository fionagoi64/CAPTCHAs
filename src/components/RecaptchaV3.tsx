import React, { useState } from "react";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";

const SITE_KEY_V3 = "your-site-key";

// Form component (uses hook)
const RecaptchaV3Form = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") || "";

    if (!executeRecaptcha) {
      setMsg("⚠️ reCAPTCHA not ready");
      return;
    }

    try {
      const token = await executeRecaptcha("submit_form");
      const res = await fetch("http://localhost:3001/submit-with-recaptcha-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, token }),
      });
      const j = await res.json();
      setMsg(JSON.stringify(j, null, 2));
    } catch (err) {
      setMsg(`❌ request error: ${String(err)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name:
        <input name="name" style={{ marginLeft: 8 }} />
      </label>
      <button type="submit">Submit</button>
      <pre>{msg}</pre>
    </form>
  );
};

// Provider wrapper
export const RecaptchaV3 = () => (
  <GoogleReCaptchaProvider reCaptchaKey={SITE_KEY_V3}>
    <RecaptchaV3Form />
  </GoogleReCaptchaProvider>
);
