// 回调 POST /api/notify  （易支付 → 本服务）
const { signString, rsaVerify, makeCode, storeGet, storePut } = require("../lib/common");

module.exports = async (req, res) => {
  try {
    let body = {};
    if (req.method === "POST") {
      if (req.headers["content-type"] && req.headers["content-type"].includes("application/json")) {
        body = req.body || {};
      } else {
        // 表单或 query string
        try { body = Object.assign({}, req.query, typeof req.body === "object" ? req.body : {}); } catch (e) {}
      }
    } else if (req.method === "GET") {
      body = req.query || {};
    }

    // 验签
    const ok = rsaVerify(signString(body), body.sign || "");
    if (!ok) return res.status(200).send("fail");

    const outTradeNo = body.out_trade_no || "";
    const key = "order:" + outTradeNo;
    const curRaw = await storeGet(key);
    if (!curRaw) return res.status(200).send("fail");

    const cur = JSON.parse(curRaw);
    if (String(body.trade_status).toUpperCase() === "TRADE_SUCCESS" && cur.status !== "done") {
      const code = makeCode(cur.goods);
      await storePut(key, JSON.stringify({ ...cur, status: "done", code }), 3600 * 24 * 30);
    }
    return res.status(200).send("success");
  } catch (e) {
    return res.status(200).send("fail");
  }
};
