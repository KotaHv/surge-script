const $ = API("jd-history-price")
const URL = $request.url;

if (URL.includes("serverConfig")) {
  const obj = JSON.parse($response.body);
  delete obj.serverConfig.httpdns;
  delete obj.serverConfig.dnsvip;
  delete obj.serverConfig.dnsvip_v6;
  $.done({
    body: JSON.stringify(obj),
  });
}

if (URL.includes("basicConfig")) {
  const obj = JSON.parse($response.body);
  if (obj.data.JDHttpToolKit) {
    delete obj.data.JDHttpToolKit.httpdns;
    delete obj.data.JDHttpToolKit.dnsvipV6;
  }
  if (obj.data.jCommandConfig) {
    delete obj.data.jCommandConfig.httpdnsConfig;
  }
  $.done({
    body: JSON.stringify(obj),
  });
}

if (URL.includes("wareBusiness") || URL.includes("pingou_item")) {
  const obj = JSON.parse($response.body);
  const floors = obj.floors;
  const commodity_info = floors[floors.length - 1];
  const url = URL.includes("pingou_item")
    ? obj.domain.h5Url
    : URL.includes("wareBusiness.style")
      ? obj.others.property.shareUrl
      : commodity_info.data.property.shareUrl;
  fetch_history_price(url).then((data) => {
    if (!data) {
      $.done();
    }
    const lowerword = adword_obj();
    lowerword.data.ad.textColor = "#fe0000";
    let bestIndex = 0;
    for (let index = 0; index < floors.length; index++) {
      const element = floors[index];
      if (element.mId == lowerword.mId) {
        bestIndex = index + 1;
        break;
      } else {
        if (element.sortId > lowerword.sortId) {
          bestIndex = index;
          break;
        }
      }
    }
    if (data.ok == 1 && data.single) {
      const lower = lowerMsgs(data.single);
      const detail = priceSummary(data);
      const tip = data.PriceRemark.Tip;
      lowerword.data.ad.adword = `${lower}\n${tip}${detail}`;
    }
    if (data.ok == 0 && data.msg.length > 0) {
      lowerword.data.ad.adword = `⚠️ ${data.msg}`;
    }
    floors.insert(bestIndex, lowerword);
    $.done({
      body: JSON.stringify(obj),
    });
  });
}

async function fetch_history_price(url) {
  const req = {
    url: "https://apapia-history.manmanbuy.com/ChromeWidgetServices/WidgetServices.ashx",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 - mmbWebBrowse - ios",
    },
    body: "methodName=getHistoryTrend&p_url=" + encodeURIComponent(url),
  };
  let body_json;
  await $.http.post(req).then(({ body }) => {
    body_json = JSON.parse(body);
  })
  return body_json;
}

function lowerMsgs(data) {
  const lower = data.lowerPriceyh;
  const lowerDate = dateFormat(data.lowerDateyh);
  const lowerMsg = "🍵 历史最低到手价：¥" + String(lower) + ` (${lowerDate}) `;
  return lowerMsg;
}

function priceSummary(data) {
  let summary = "";
  let listPriceDetail = data.PriceRemark.ListPriceDetail.slice(0, 4);
  let list = listPriceDetail.concat(historySummary(data.single));
  list.forEach((item, index) => {
    if (item.Name == "双11价格") {
      item.Name = "双十一价格";
    } else if (item.Name == "618价格") {
      item.Name = "六一八价格";
    }
    let price = String(parseInt(item.Price.substr(1)));
    summary += `\n${item.Name}   ${isNaN(price) ? "-" : "¥" + price}   ${item.Date
      }   ${item.Difference}`;
  });
  return summary;
}

function historySummary(single) {
  let list = JSON.parse("[" + single.jiagequshiyh + "]");
  const currentDate = formatTime(list[list.length - 1][0]);
  const currentPrice = list[list.length - 1][1];
  const lowest30 = {
    Name: "三十天最低",
    Price: `¥${String(currentPrice)}`,
    Date: currentDate,
    price: currentPrice,
  };
  const lowest90 = {
    Name: "九十天最低",
    Price: `¥${String(currentPrice)}`,
    Date: currentDate,
    price: currentPrice,
  };
  const lowest180 = {
    Name: "一百八最低",
    Price: `¥${String(currentPrice)}`,
    Date: currentDate,
    price: currentPrice,
  };
  const lowest360 = {
    Name: "三百六最低",
    Price: `¥${String(currentPrice)}`,
    Date: currentDate,
    price: currentPrice,
  };
  list = list.reverse().slice(1, 360);
  list.forEach((item, index) => {
    const date = formatTime(item[0]);
    const price = parseFloat(item[1]);

    if (index < 30 && price < lowest30.price) {
      lowest30.price = price;
      lowest30.Price = `¥${String(price)}`;
      lowest30.Date = date;
      lowest30.Difference = difference(currentPrice, price);
    }
    if (index < 90 && price < lowest90.price) {
      lowest90.price = price;
      lowest90.Price = `¥${String(price)}`;
      lowest90.Date = date;
      lowest90.Difference = difference(currentPrice, price);
    }
    if (index < 180 && price < lowest180.price) {
      lowest180.price = price;
      lowest180.Price = `¥${String(price)}`;
      lowest180.Date = date;
      lowest180.Difference = difference(currentPrice, price);
    }
    if (index < 360 && price < lowest360.price) {
      lowest360.price = price;
      lowest360.Price = `¥${String(price)}`;
      lowest360.Date = date;
      lowest360.Difference = difference(currentPrice, price);
    }
  });
  return [lowest30, lowest90, lowest180];
}

function difference(currentPrice, price) {
  let difference = sub(currentPrice, price);
  if (difference == 0) {
    return "-";
  } else {
    return `${difference > 0 ? "↑" : "↓"}${String(difference)}`;
  }
}

function sub(arg1, arg2) {
  return add(arg1, -Number(arg2), arguments[2]);
}

function add(arg1, arg2) {
  (arg1 = arg1.toString()), (arg2 = arg2.toString());
  var arg1Arr = arg1.split("."),
    arg2Arr = arg2.split("."),
    d1 = arg1Arr.length == 2 ? arg1Arr[1] : "",
    d2 = arg2Arr.length == 2 ? arg2Arr[1] : "";
  var maxLen = Math.max(d1.length, d2.length);
  var m = Math.pow(10, maxLen);
  var result = Number(((arg1 * m + arg2 * m) / m).toFixed(maxLen));
  var d = arguments[2];
  return typeof d === "number" ? Number(result.toFixed(d)) : result;
}

function dateFormat(cellval) {
  const date = new Date(
    parseInt(cellval.replace("/Date(", "").replace(")/", ""), 10)
  );
  const month =
    date.getMonth() + 1 < 10
      ? "0" + (date.getMonth() + 1)
      : date.getMonth() + 1;
  const currentDate =
    date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  return date.getFullYear() + "-" + month + "-" + currentDate;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

function adword_obj() {
  return {
    bId: "eCustom_flo_199",
    cf: {
      bgc: "#ffffff",
      spl: "empty",
    },
    data: {
      ad: {
        adword: "",
        textColor: "#8C8C8C",
        color: "#f23030",
        newALContent: true,
        hasFold: true,
        class: "com.jd.app.server.warecoresoa.domain.AdWordInfo.AdWordInfo",
        adLinkContent: "",
        adLink: "",
      },
    },
    mId: "bpAdword",
    refId: "eAdword_0000000028",
    sortId: 13,
  };
}

function ENV() { const e = "function" == typeof require && "undefined" != typeof $jsbox; return { isQX: "undefined" != typeof $task, isLoon: "undefined" != typeof $loon, isSurge: "undefined" != typeof $httpClient && "undefined" != typeof $utils, isBrowser: "undefined" != typeof document, isNode: "function" == typeof require && !e, isJSBox: e, isRequest: "undefined" != typeof $request, isScriptable: "undefined" != typeof importModule } } function HTTP(e = { baseURL: "" }) { const { isQX: t, isLoon: s, isSurge: o, isScriptable: n, isNode: i, isBrowser: r } = ENV(), u = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/; const a = {}; return ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"].forEach(h => a[h.toLowerCase()] = (a => (function (a, h) { h = "string" == typeof h ? { url: h } : h; const d = e.baseURL; d && !u.test(h.url || "") && (h.url = d ? d + h.url : h.url), h.body && h.headers && !h.headers["Content-Type"] && (h.headers["Content-Type"] = "application/x-www-form-urlencoded"); const l = (h = { ...e, ...h }).timeout, c = { onRequest: () => { }, onResponse: e => e, onTimeout: () => { }, ...h.events }; let f, p; if (c.onRequest(a, h), t) f = $task.fetch({ method: a, ...h }); else if (s || o || i) f = new Promise((e, t) => { (i ? require("request") : $httpClient)[a.toLowerCase()](h, (s, o, n) => { s ? t(s) : e({ statusCode: o.status || o.statusCode, headers: o.headers, body: n }) }) }); else if (n) { const e = new Request(h.url); e.method = a, e.headers = h.headers, e.body = h.body, f = new Promise((t, s) => { e.loadString().then(s => { t({ statusCode: e.response.statusCode, headers: e.response.headers, body: s }) }).catch(e => s(e)) }) } else r && (f = new Promise((e, t) => { fetch(h.url, { method: a, headers: h.headers, body: h.body }).then(e => e.json()).then(t => e({ statusCode: t.status, headers: t.headers, body: t.data })).catch(t) })); const y = l ? new Promise((e, t) => { p = setTimeout(() => (c.onTimeout(), t(`${a} URL: ${h.url} exceeds the timeout ${l} ms`)), l) }) : null; return (y ? Promise.race([y, f]).then(e => (clearTimeout(p), e)) : f).then(e => c.onResponse(e)) })(h, a))), a } function API(e = "untitled", t = !1) { const { isQX: s, isLoon: o, isSurge: n, isNode: i, isJSBox: r, isScriptable: u } = ENV(); return new class { constructor(e, t) { this.name = e, this.debug = t, this.http = HTTP(), this.env = ENV(), this.node = (() => { if (i) { return { fs: require("fs") } } return null })(), this.initCache(); Promise.prototype.delay = function (e) { return this.then(function (t) { return ((e, t) => new Promise(function (s) { setTimeout(s.bind(null, t), e) }))(e, t) }) } } initCache() { if (s && (this.cache = JSON.parse($prefs.valueForKey(this.name) || "{}")), (o || n) && (this.cache = JSON.parse($persistentStore.read(this.name) || "{}")), i) { let e = "root.json"; this.node.fs.existsSync(e) || this.node.fs.writeFileSync(e, JSON.stringify({}), { flag: "wx" }, e => console.log(e)), this.root = {}, e = `${this.name}.json`, this.node.fs.existsSync(e) ? this.cache = JSON.parse(this.node.fs.readFileSync(`${this.name}.json`)) : (this.node.fs.writeFileSync(e, JSON.stringify({}), { flag: "wx" }, e => console.log(e)), this.cache = {}) } } persistCache() { const e = JSON.stringify(this.cache, null, 2); s && $prefs.setValueForKey(e, this.name), (o || n) && $persistentStore.write(e, this.name), i && (this.node.fs.writeFileSync(`${this.name}.json`, e, { flag: "w" }, e => console.log(e)), this.node.fs.writeFileSync("root.json", JSON.stringify(this.root, null, 2), { flag: "w" }, e => console.log(e))) } write(e, t) { if (this.log(`SET ${t}`), -1 !== t.indexOf("#")) { if (t = t.substr(1), n || o) return $persistentStore.write(e, t); if (s) return $prefs.setValueForKey(e, t); i && (this.root[t] = e) } else this.cache[t] = e; this.persistCache() } read(e) { return this.log(`READ ${e}`), -1 === e.indexOf("#") ? this.cache[e] : (e = e.substr(1), n || o ? $persistentStore.read(e) : s ? $prefs.valueForKey(e) : i ? this.root[e] : void 0) } delete(e) { if (this.log(`DELETE ${e}`), -1 !== e.indexOf("#")) { if (e = e.substr(1), n || o) return $persistentStore.write(null, e); if (s) return $prefs.removeValueForKey(e); i && delete this.root[e] } else delete this.cache[e]; this.persistCache() } notify(e, t = "", a = "", h = {}) { const d = h["open-url"], l = h["media-url"]; if (s && $notify(e, t, a, h), n && $notification.post(e, t, a + `${l ? "\n多媒体:" + l : ""}`, { url: d }), o) { let s = {}; d && (s.openUrl = d), l && (s.mediaUrl = l), "{}" === JSON.stringify(s) ? $notification.post(e, t, a) : $notification.post(e, t, a, s) } if (i || u) { const s = a + (d ? `\n点击跳转: ${d}` : "") + (l ? `\n多媒体: ${l}` : ""); if (r) { require("push").schedule({ title: e, body: (t ? t + "\n" : "") + s }) } else console.log(`${e}\n${t}\n${s}\n\n`) } } log(e) { this.debug && console.log(`[${this.name}] LOG: ${this.stringify(e)}`) } info(e) { console.log(`[${this.name}] INFO: ${this.stringify(e)}`) } error(e) { console.log(`[${this.name}] ERROR: ${this.stringify(e)}`) } wait(e) { return new Promise(t => setTimeout(t, e)) } done(e = {}) { s || o || n ? $done(e) : i && !r && "undefined" != typeof $context && ($context.headers = e.headers, $context.statusCode = e.statusCode, $context.body = e.body) } stringify(e) { if ("string" == typeof e || e instanceof String) return e; try { return JSON.stringify(e, null, 2) } catch (e) { return "[object Object]" } } }(e, t) }
