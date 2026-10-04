// 下单 POST /api/create
const { signString, rsaSign, storePut } = require("../lib/common");

const PRICE = { d: 1, m: 10, y: 99 };
const NAME = { d: "热点雷达-1天会员", m: "热点雷达-1个月会员", y: "热点雷达-1年会员" };

module.exports = async (req, res) => {
  const json = (code, obj) => res.status(200).json(Object.assign({ code }, obj));
  try {
    let body = {};
    try { body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); } catch (e) {}

    if (body.token !== process.env.CLIENT_TOKEN) return json(0, { msg: "令牌无效" });
    const goods = ["d", "m", "y"].includes(body.goods) ? body.goods : null;
    if (!goods) return json(0, { msg: "无效套餐" });

    const outTradeNo = "HR" + Date.now() + Math.floor(Math.random() * 900 + 100);
    const clientIp = (req.headers["x-forwarded-for"] || "127.0.0.1").split(",")[0].trim();

    const params = {
      pid: process.env.PID, method: "web", device: "pc", type: "alipay",
      out_trade_no: outTradeNo,
      notify_url: process.env.NOTIFY_URL, return_url: process.env.NOTIFY_URL,
      name: NAME[goods], money: PRICE[goods].toFixed(2), clientip: clientIp,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    params.sign = rsaSign(signString(params));
    params.sign_type = "RSA";

    const r = await fetch(process.env.API_HOST + "/api/pay/create", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    const text = await r.text();
    let pay; try { pay = JSON.parse(text); } catch (e) { pay = { code: -1, msg: "易支付响应异常: " + text.slice(0, 120) }; }

    if (pay.code === 0) {
      await storePut("order:" + outTradeNo, JSON.stringify({ status: "pending", goods, code: "" }), 7200);
      return json(1, { out_trade_no: outTradeNo, money: PRICE[goods].toFixed(2), pay_type: pay.pay_type, pay_info: pay.pay_info });
    }
    return json(0, { msg: pay.msg || "下单失败" });
  } catch (e) {
    return json(0, { msg: "server error: " + e.message });
  }
};
