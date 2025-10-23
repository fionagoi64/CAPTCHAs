import React, { useState } from "react";

export const NormalForm: React.FC = () => {
  const [msg, setMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    if (!name.trim()) {
      setMsg("enter your name");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/submit-no-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        setMsg(`submitted failed: HTTP ${res.status}`);
        return;
      }

      const j = await res.json();
      setMsg(JSON.stringify(j, null, 2));
    } catch (err) {
      setMsg(`request error: ${String(err)}`);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Normal Form</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input name="name" />
        </label>

        <div style={{ marginTop: 12 }}>
          <button type="submit" data-testid="submit-btn">
            Submit
          </button>
        </div>
      </form>
      <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{msg}</pre>
    </div>
  );
};
