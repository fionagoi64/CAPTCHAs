import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

RECAPTCHA_V2_SECRET=your-secret-v2
RECAPTCHA_V3_SECRET=your-secret-v3
HCAPTCHA_SECRET=your-hcaptcha-secret

// 🧠 Verify Google reCAPTCHA v2
async function verifyRecaptchaV2(token, remoteip) {
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: RECAPTCHA_V2_SECRET,
      response: token,
      remoteip,
    }),
  });
  return res.json();
}

// 🧠 Verify Google reCAPTCHA v3
async function verifyRecaptchaV3(token, remoteip) {
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: RECAPTCHA_V3_SECRET,
      response: token,
      remoteip,
    }),
  });
  return res.json();
}

// 🧠 Verify hCaptcha
async function verifyHCaptcha(token, remoteip) {
  const res = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: HCAPTCHA_SECRET,
      response: token,
      remoteip,
    }),
  });
  return res.json();
}

// In-memory storage
let storage = [];

// --- Routes ---

// v2 reCAPTCHA (checkbox)
app.post("/submit-with-recaptcha-v2", async (req, res) => {
  const { name, token } = req.body;
  if (!token) return res.status(400).json({ ok: false, err: "missing token" });

  try {
    const v = await verifyRecaptchaV2(token, req.ip);
    if (!v.success) return res.status(403).json({ ok: false, err: "recaptcha v2 failed", detail: v });

    storage.push({ name, ts: Date.now(), source: "recaptcha-v2", verify: v });
    res.json({ ok: true, msg: "accepted (reCAPTCHA v2)", verify: v });
  } catch (err) {
    res.status(500).json({ ok: false, err: String(err) });
  }
});

// v3 reCAPTCHA
app.post("/submit-with-recaptcha-v3", async (req, res) => {
  const { name, token } = req.body;
  if (!token) return res.status(400).json({ ok: false, err: "missing token" });

  try {
    const v = await verifyRecaptchaV3(token, req.ip);
    if (!v.success || (v.score && v.score < 0.5)) {
      console.log("❌ reCAPTCHA v3 failed:", v);
      return res.status(403).json({ ok: false, err: "recaptcha v3 failed", detail: v });
    }

    storage.push({ name, ts: Date.now(), source: "recaptcha-v3", score: v.score, verify: v });
    res.json({ ok: true, msg: "accepted (reCAPTCHA v3)", verify: v });
  } catch (err) {
    res.status(500).json({ ok: false, err: String(err) });
  }
});

// hCaptcha
app.post("/submit-with-hcaptcha", async (req, res) => {
  const { name, token } = req.body;
  if (!token) return res.status(400).json({ ok: false, err: "missing token" });

  try {
    const v = await verifyHCaptcha(token, req.ip);
    if (!v.success) return res.status(403).json({ ok: false, err: "hcaptcha failed", detail: v });

    storage.push({ name, ts: Date.now(), source: "hcaptcha", verify: v });
    res.json({ ok: true, msg: "accepted (hCaptcha)", verify: v });
  } catch (err) {
    res.status(500).json({ ok: false, err: String(err) });
  }
});

// Stats
app.get("/stats", (req, res) => res.json({ total: storage.length, storage }));

app.listen(3001, () => console.log("✅ Server listening on http://localhost:3001"));
