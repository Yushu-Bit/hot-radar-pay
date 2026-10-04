// 查询/领取兑换码 GET /api/query?out_trade_no=..&token=..
const { storeGet } = require("../lib/common");

module.exports = async (req, res) => {
  const q = req.query || {};
  if (q.token !== process.env.CLIENT_TOKEN) {
    return res.status(200).json({ code: 0, msg: "令牌无效" });
  }
  const curRaw = await storeGet("order:" + (q.out_trade_no || ""));
  if (!curRaw) return res.status(200).json({ code: 0, msg: "订单不存在" });
  const cur = JSON.parse(curRaw);
  if (cur.status === "done" && cur.code) {
    return res.status(200).json({ code: 1, status: "done", code: cur.code });
  }
  return res.status(200).json({ code: 0, status: cur.status, msg: "等待支付" });
};
