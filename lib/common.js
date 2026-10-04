// 公共逻辑：签名 / 兑换码 / 存储
const crypto = require("node:crypto");

// ---------- 易支付 V2 RSA 签名 ----------
// 签名串：剔 sign/sign_type，非空参数按 key ASCII 升序拼 k=v&
// 若环境变量里是裸 base64(无 PEM 头尾)，补成 PEM，Node 才能识别
function wrapPem(s, type) {
  s = String(s || "").trim();
  if (/-----BEGIN/.test(s)) return s;
  const b = s.replace(/\s+/g, "");
  const line = b.replace(/(.{64})/g, "$1\n").trim();
  return "-----BEGIN " + type + "-----\n" + line + "\n-----END " + type + "-----";
}
function signString(params) {
  const kv = {};
  for (const k in params) {
    const v = params[k];
    if (k === "sign" || k === "sign_type") continue;
    if (v === "" || v === null || v === undefined) continue;
    kv[k] = String(v);
  }
  return Object.keys(kv).sort().map((k) => k + "=" + kv[k]).join("&");
}
function rsaSign(dataStr) {
  const s = crypto.createSign("RSA-SHA256");
  s.update(dataStr, "utf8");
  return s.sign(wrapPem(process.env.PRIV_KEY, "PRIVATE KEY"), "base64"); // 商户RSA私钥
}
function rsaVerify(dataStr, sigB64) {
  if (!sigB64) return false;
  try {
    const v = crypto.createVerify("RSA-SHA256");
    v.update(dataStr, "utf8");
    return v.verify(wrapPem(process.env.PLATFORM_PUB, "PUBLIC KEY"), Buffer.from(sigB64, "base64"));
  } catch (e) { return false; }
}

// ---------- base32 ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(bytes) {
  let bits = "", out = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i < bits.length; i += 5) {
    out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return out.replace(/=+$/, "");
}

// ---------- 兑换码生成 (Ed25519, 与本地发码器一致) ----------
const LIC = { d: "D", m: "M", y: "Y" };
let _licKey = null;
function licKey() {
  if (!_licKey) {
    _licKey = crypto.createPrivateKey({
      key: Buffer.from(process.env.LIC_PRIV, "base64"),
      format: "der", type: "pkcs8",
    });
  }
  return _licKey;
}
function makeCode(goods) {
  const typ = LIC[goods] || "D";
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const payload = Buffer.from("HR2|" + typ + "|" + ymd, "utf8");
  const sig = crypto.sign(null, payload, licKey()); // Ed25519
  const joined = Buffer.concat([payload, sig]);
  const b32 = base32(joined);
  const parts = [];
  for (let i = 0; i < b32.length; i += 4) parts.push(b32.slice(i, i + 4));
  return parts.join("-");
}

// ---------- Upstash Redis (免费) ----------
function upstashUrl() { return process.env.UPSTASH_URL; }
function upstashToken() { return process.env.UPSTASH_TOKEN; }
async function storePut(key, value, ttlSec) {
  const q = ttlSec ? "?EX=" + ttlSec : "";
  const r = await fetch(upstashUrl() + "/set/" + key + q, {
    method: "POST",
    body: JSON.stringify(value),
    headers: { Authorization: "Bearer " + upstashToken() },
  });
  return r.ok;
}
async function storeGet(key) {
  const r = await fetch(upstashUrl() + "/get/" + key, {
    headers: { Authorization: "Bearer " + upstashToken() },
  });
  const j = await r.json();
  return j && j.result !== undefined ? j.result : null;
}

module.exports = { signString, rsaSign, rsaVerify, makeCode, storePut, storeGet };
