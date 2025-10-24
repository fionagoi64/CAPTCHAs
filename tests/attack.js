import fetch from "node-fetch";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AnonymizeUA from "puppeteer-extra-plugin-anonymize-ua";

puppeteerExtra.use(StealthPlugin());
puppeteerExtra.use(AnonymizeUA());

// ------------- Configuration -------------
const BACKEND_BASE = "http://localhost:3001";
const FRONTEND_WITH_CAPTCHA = "http://localhost:5173/with-recaptcha-v2";
const NO_CAPTCHA_ENDPOINT = `${BACKEND_BASE}/submit-no-captcha`;
const WITH_CAPTCHA_ENDPOINT = `${BACKEND_BASE}/submit-with-recaptcha-v2`;

const NO_CAPTCHA_TOTAL = 500; // total requests to send to no-captcha
const NO_CAPTCHA_CONCURRENCY = 100; // concurrency level

const PUPPETEER_ATTEMPTS = 3; // number of puppeteer pages to attempt to get token
const HEADLESS = false; // show browser for demo (set true for headless runs)
// -----------------------------------------

// ------------ Helpers / Metrics ------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function floodNoCaptcha(total, concurrency) {
  console.log(
    `\n[NO-CAPTCHA] Starting flood: total=${total} concurrency=${concurrency}`
  );
  let sent = 0,
    ok = 0,
    fail = 0;
  const errors = {};

  const makeOne = async (i) => {
    const body = { name: `bot-${i}`, email: `bot-${i}@example.com` };
    try {
      const r = await fetch(NO_CAPTCHA_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      sent++;
      if (r.ok) ok++;
      else {
        fail++;
        errors[r.status] = (errors[r.status] || 0) + 1;
      }
    } catch (e) {
      sent++;
      fail++;
      const k = e.message || "network";
      errors[k] = (errors[k] || 0) + 1;
    }
  };

  const batches = Math.ceil(total / concurrency);
  const start = Date.now();
  for (let b = 0; b < batches; b++) {
    const batch = [];
    for (let i = 0; i < concurrency && b * concurrency + i < total; i++) {
      batch.push(makeOne(b * concurrency + i));
    }
    await Promise.all(batch);
    // slight pause to avoid totally saturating CPU in demo
    await sleep(50);
    process.stdout.write(
      `\r[NO-CAPTCHA] progress sent=${sent} ok=${ok} fail=${fail}`
    );
  }
  const elapsed = (Date.now() - start) / 1000;
  console.log(
    `\n[NO-CAPTCHA] Done. elapsed=${elapsed}s sent=${sent} ok=${ok} fail=${fail}`
  );
  return { sent, ok, fail, elapsed, errors };
}

async function attemptWithCaptcha(attempts) {
  console.log(
    `\n[WITH-CAPTCHA] Starting puppeteer attempts: ${attempts} (headless=${HEADLESS})`
  );
  const browser = await puppeteerExtra.launch({
    headless: HEADLESS,
    defaultViewport: null,
    args: ["--no-sandbox"],
  });
  const results = [];
  try {
    for (let i = 0; i < attempts; i++) {
      const page = await browser.newPage();
      console.log(`[WITH-CAPTCHA] Attempt #${i + 1}: open page`);
      try {
        await page.goto(FRONTEND_WITH_CAPTCHA, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // list frames for debugging
        const frames = page.frames().map((f) => f.url());
        console.log(`[WITH-CAPTCHA] frames count=${frames.length}`);

        // wait for recaptcha iframe if exists (v2 anchor)
        try {
          await page.waitForSelector("iframe[src*='recaptcha']", {
            timeout: 8000,
          });
          console.log("[WITH-CAPTCHA] recaptcha iframe detected");
        } catch (e) {
          console.warn(
            "[WITH-CAPTCHA] recaptcha iframe NOT detected (maybe v3/invisible)"
          );
        }

        // try to click checkbox in anchor frame (v2)
        const framesObj = page.frames();
        const anchorFrame = framesObj.find((f) =>
          /recaptcha\/api2\/anchor/.test(f.url())
        );
        if (anchorFrame) {
          const checkbox = await anchorFrame.$("#recaptcha-anchor");
          if (checkbox) {
            console.log("[WITH-CAPTCHA] clicking recaptcha checkbox...");
            await checkbox.click({ delay: 150 });
            // wait a bit for challenge or token using sleep instead of page.waitForTimeout
            await sleep(3000);
          } else {
            console.warn(
              "[WITH-CAPTCHA] anchor frame found but #recaptcha-anchor missing"
            );
          }
        } else {
          console.warn(
            "[WITH-CAPTCHA] anchor frame not found; might be invisible or v3"
          );
        }

        // wait for token up to 10s
        let token = "";
        try {
          await page.waitForFunction(
            () => {
              try {
                return (
                  window.grecaptcha &&
                  typeof window.grecaptcha.getResponse === "function" &&
                  window.grecaptcha.getResponse().length > 0
                );
              } catch (e) {
                return false;
              }
            },
            { timeout: 10000 }
          );
          token = await page.evaluate(() => window.grecaptcha.getResponse());
        } catch (e) {
          // fallback: read whatever is present
          token = await page.evaluate(
            () => window.grecaptcha?.getResponse?.() ?? ""
          );
        }

        console.log(`[WITH-CAPTCHA] token length=${token ? token.length : 0}`);

        if (token) {
          // send token to backend
          const resp = await page.evaluate(async (t) => {
            const r = await fetch(WITH_CAPTCHA_ENDPOINT, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "puppeteer-bot", token: t }),
            });
            const body = await r.text();
            return { status: r.status, body };
          }, token);

          console.log(`[WITH-CAPTCHA] submit result status=${resp.status}`);
          results.push({
            attempt: i + 1,
            tokenObtained: true,
            submitStatus: resp.status,
            submitBody: resp.body,
          });
        } else {
          console.log(
            "[WITH-CAPTCHA] no token obtained (likely challenge required)"
          );
          results.push({ attempt: i + 1, tokenObtained: false });
        }
      } catch (err) {
        console.error(
          `[WITH-CAPTCHA] attempt #${i + 1} error:`,
          err.message || err
        );
        results.push({ attempt: i + 1, error: String(err) });
      } finally {
        try {
          await page.close();
        } catch (_) {}
      }

      // small pause between attempts
      await sleep(800);
    }
  } finally {
    await browser.close();
  }

  // aggregate
  const successTokens = results.filter((r) => r.tokenObtained).length;
  return { attempts, results, successTokens };
}

// -------------- Main runner ----------------
(async () => {
  console.log("=== Attack demo starting ===");

  // 1) Flood no-captcha (fire and forget concurrency)
  const noCaptchaPromise = floodNoCaptcha(
    NO_CAPTCHA_TOTAL,
    NO_CAPTCHA_CONCURRENCY
  );

  // 2) Simultaneously run puppeteer attempts for with-captcha
  const withCaptchaPromise = attemptWithCaptcha(PUPPETEER_ATTEMPTS);

  const [noCaptchaRes, withCaptchaRes] = await Promise.all([
    noCaptchaPromise,
    withCaptchaPromise,
  ]);

  console.log("\n=== SUMMARY ===");
  console.log("[NO-CAPTCHA] ", noCaptchaRes);
  console.log("[WITH-CAPTCHA] ", {
    attempts: withCaptchaRes.attempts,
    successTokens: withCaptchaRes.successTokens,
    results: withCaptchaRes.results,
  });

  console.log(
    "\nTip: inspect backend /stats to see stored records (and check differences)."
  );
})();
