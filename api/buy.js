// 购买页 GET /api/buy
const BUY_HTML = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>热点雷达 · 会员续费</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f;margin:0;padding:24px;display:flex;justify-content:center}
.card{background:#fff;border-radius:18px;box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:420px;width:100%;padding:28px;box-sizing:border-box}
h1{font-size:20px;margin:0 0 4px}.sub{color:#86868b;font-size:13px;margin-bottom:20px}
.plan{border:1.5px solid #e8e8ed;border-radius:12px;padding:14px 16px;margin-bottom:12px;cursor:pointer;transition:.15s;display:flex;justify-content:space-between;align-items:center}
.plan:hover{border-color:#007aff}.plan.sel{border-color:#007aff;background:#f0f7ff}
.plan .t{font-size:15px;font-weight:600}.plan .p{color:#007aff;font-weight:700}
.btn{background:#007aff;color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:600;width:100%;cursor:pointer;margin-top:6px}
.btn:disabled{background:#c7c7cc;cursor:not-allowed}
.qr{margin-top:18px;text-align:center}
.qr img,.qr canvas{width:230px;height:230px;border:1px solid #eee;border-radius:12px}
.qr .m{color:#86868b;font-size:13px;margin-top:8px}
.codebox{margin-top:18px;background:#f0f7ff;border:1px solid #b8dcff;border-radius:12px;padding:14px;text-align:center}
.codebox .cd{font-size:17px;font-weight:700;color:#007aff;word-break:break-all;letter-spacing:1px}
.stat{color:#34c759;font-size:13px;margin-top:10px;text-align:center}
</style></head><body><div class="card">
<h1>热点雷达 · 会员续费</h1><div class="sub">付款成功后自动发放兑换码，到软件「设置」中兑换</div>
<div class="plan sel" data-g="m"><div><div class="t">1 个月会员</div><div style="font-size:12px;color:#86868b">自兑换起 1 个自然月</div></div><div class="p">¥10</div></div>
<div class="plan" data-g="y"><div><div class="t">1 年会员</div><div style="font-size:12px;color:#86868b">自兑换起 1 个自然年</div></div><div class="p">¥99</div></div>
<div class="plan" data-g="d"><div><div class="t">1 天会员</div><div style="font-size:12px;color:#86868b">自兑换起当天有效</div></div><div class="p">¥1</div></div>
<button class="btn" id="pay">支付并获取兑换码</button>
<div class="qr" id="qr" style="display:none"><div id="qrcanvas"></div><div class="m">请使用 <b>支付宝/微信</b> 扫码支付</div></div>
<div class="stat" id="st"></div>
<div class="codebox" id="cb" style="display:none">兑换码（到软件「设置」→ 粘贴 → 激活）<div class="cd" id="cd"></div><button class="btn" id="copy" style="margin-top:10px;padding:10px;font-size:14px">复制兑换码</button></div>
</div>
<script>
const TOKEN="__CLIENT_TOKEN__";
let goods="m", ot="", timer=null;
document.querySelectorAll(".plan").forEach(el=>{el.onclick=()=>{document.querySelectorAll(".plan").forEach(x=>x.classList.remove("sel"));el.classList.add("sel");goods=el.dataset.g;};});
const qrWrap=document.getElementById("qrcanvas");
function showQR(text){
  qrWrap.innerHTML="";
  if(/^https?:\\/\\/.*\\.(png|jpg|jpeg|gif)(\\?|$)/i.test(text)){const im=document.createElement("img");im.src=text;qrWrap.appendChild(im);return;}
  const s=document.createElement("script");
  s.src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
  s.onload=()=>{new QRCode(qrWrap,{text,width:230,height:230,correctLevel:QRCode.CorrectLevel.M});};
  s.onerror=()=>{qrWrap.textContent="二维码加载失败，请点击链接支付：";const a=document.createElement("a");a.href=text;a.textContent="点此跳转支付";qrWrap.appendChild(a);};
  document.body.appendChild(s);
}
document.getElementById("pay").onclick=async()=>{
  const b=document.getElementById("pay");b.disabled=true;b.textContent="正在生成订单…";
  const r=await fetch("/api/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:TOKEN,goods})});
  const j=await r.json();
  if(j.code!==1){document.getElementById("st").textContent=j.msg||"下单失败";b.disabled=false;b.textContent="支付并获取兑换码";return;}
  ot=j.out_trade_no;
  document.getElementById("qr").style.display="block";
  document.getElementById("st").textContent="等待支付…";
  showQR(j.pay_info);
  b.textContent="已生成订单";
  timer=setInterval(poll,2500);
};
async function poll(){
  const r=await fetch("/api/query?out_trade_no="+ot+"&token="+TOKEN);const j=await r.json();
  if(j.code===1){clearInterval(timer);
    document.getElementById("qr").style.display="none";
    document.getElementById("st").textContent="支付成功！";
    document.getElementById("cb").style.display="block";
    document.getElementById("cd").textContent=j.code;
    const b=document.getElementById("pay");b.disabled=true;b.textContent="已完成";
  }
}
document.getElementById("copy").onclick=()=>{const t=document.getElementById("cd").textContent;navigator.clipboard&&navigator.clipboard.writeText(t);document.getElementById("st").textContent="已复制兑换码";};
</script></body></html>`;

module.exports = async (req, res) => {
  const html = BUY_HTML.replace("__CLIENT_TOKEN__", process.env.CLIENT_TOKEN || "");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
};
