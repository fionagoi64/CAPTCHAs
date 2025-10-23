
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { NormalForm } from "./components/NormalForm";
import { RecaptchaV2 } from "./components/RecaptchaV2";
import {Hcaptcha} from "./components/Hcaptcha";
import { RecaptchaV3 } from "./components/RecaptchaV3";


export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: "flex", gap: 12, padding: 12 }}>
        <Link to="/">No CAPTCHA</Link>
        <Link to="/with-captcha-v2">With reCAPTCHA V2</Link>
         <Link to="/with-captcha-v3">With reCAPTCHA V3</Link>
        <Link to="/with-hcaptcha">With HCaptcha</Link>
      </nav>
      <Routes>
        <Route path="/" element={<NormalForm />} />
        <Route path="/with-captcha-v2" element={<RecaptchaV2 />} />
         <Route path="/with-captcha-v3" element={<RecaptchaV3 />} />
         <Route path="/with-hcaptcha" element={<Hcaptcha />} />
      </Routes>
    </BrowserRouter>
  );
}
