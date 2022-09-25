const title = "京东签到";
const jdCookieKey = "cookie-jd";
const bodyKey = "body-jr";
const $ = API(title)
const COOKIE = $.read(jdCookieKey);
const BODY = $.read(bodyKey);

if (typeof $request !== "undefined") {
  getCookie();
  $.done();
} else {
  checkin().then(() => $.done());
}

function getCookie() {
  let msg = `获取cookie失败\n${$request.url}`;
  if ($request.headers) {
    let cookie = $request.headers["Cookie"] ? $request.headers["Cookie"] : "";
    if (
      /^https:\/\/(me-|)api(\.m|)\.jd\.com\/(client\.|user_new)/.test(
        $request.url
      )
    ) {
      cookie = cookie.match(/(pt_key|pt_pin)=.+?;/g);
      $.info("正在获取京东cookie", $request.url, cookie);
      if (cookie && cookie.length == 2) {
        cookie = cookie.join("");
        const oldCookie = COOKIE;
        msg = oldCookie ? "更新" : "写入";
        if (cookie != oldCookie) {
          $.write(cookie, jdCookieKey);
          msg += "Cookie成功 🎉";
        } else {
          $.info("已是最新Cookie");
          return;
        }
      } else {
        msg = "写入Cookie失败, 关键值缺失\n可能原因: 非网页获取 ‼️";
      }
    }
    $.info(cookie);
  } else if (
    /^https:\/\/ms\.jr\.jd\.com\/gw\/generic\/hy\/h5\/m\/(appSign|jrSign)\?/.test(
      $request.url
    )
  ) {
    if ($request.body) {
      $.write($request.body, bodyKey);
      msg = "写入京东金融body数据成功 🎉";
    } else {
      msg = "获取京东金融body数据失败‼️";
    }
  }
  $.notify(title, "", msg);
}

async function checkin() {
  let msg = "";
  msg += (await jdBean()) + "\n"; // 京豆
  msg += (await jrSubsidy()) + "\n"; // 金融金贴
  msg += (await jdCash()) + "\n"; // 现金
  msg += (await jrBeanDouble()) + "\n"; // 金融京豆-双签
  let msg2 = "";
  msg2 += (await TotalCash()) + "\n";
  msg2 += (await TotalBean()) + "\n";
  msg2 += (await TotalSubsidy()) + "\n";
  msg2 += (await TotalMoney()) + "\n";
  msg = msg2 + msg;
  $.notify(title, "", msg);
}

async function jdBean() {
  let msg = "";
  const req = {
    url: "https://api.m.jd.com/client.action",
    headers: {
      Cookie: COOKIE,
    },
    body: "functionId=signBeanIndex&appid=ld",
  };
  await $.http.post(req).then(({ body }) => {
    const data = JSON.parse(body);
    if (data.code == 3) {
      msg = "京东商城-京豆: 失败, 原因: Cookie失效‼️";
    } else if (body.match(/跳转至拼图/)) {
      msg = "京东商城-京豆: 失败, 需要拼图验证 ⚠️";
    } else if (body.match(/\"status\":\"?1\"?/)) {
      if (body.match(/dailyAward/)) {
        msg =
          "京东商城-京豆: 成功, 明细: " +
          data.data.dailyAward.beanAward.beanCount +
          "京豆 🐶";
      } else if (body.match(/continuityAward/)) {
        msg =
          "京东商城-京豆: 成功, 明细: " +
          data.data.continuityAward.beanAward.beanCount +
          "京豆 🐶";
      } else if (body.match(/新人签到/)) {
        const quantity = body.match(/beanCount\":\"(\d+)\".+今天/);
        msg =
          "京东商城-京豆: 成功, 明细: " +
          (quantity ? quantity[1] : "无") +
          "京豆 🐶";
      } else {
        msg = "京东商城-京豆: 成功, 明细: 无京豆 🐶";
      }
    } else {
      if (body.match(/(已签到|新人签到)/)) {
        msg = "京东商城-京豆: 失败, 原因: 已签过 ⚠️";
      } else if (body.match(/人数较多|S101/)) {
        msg = "京东商城-京豆: 失败, 签到人数较多 ⚠️";
      } else {
        msg = "京东商城-京豆: 失败, 原因: 未知 ⚠️";
      }
    }
  }).catch((err) => {
    msg = `京东请求失败!\n${err}`;
  })
  $.info(msg);
  return msg;
}

async function jrSubsidy() {
  let msg = "";
  const req = {
    url: "https://ms.jr.jd.com/gw/generic/hy/h5/m/jrSign",
    headers: {
      Cookie: COOKIE,
    },
    body: BODY,
  };
  await $.http.post(req).then(({ body }) => {
    const data = JSON.parse(body);
    if (
      data.resultCode == 0 &&
      data.resultData &&
      data.resultData.resBusiCode == 0
    ) {
      msg = `京东金融-金贴: 成功, 获得金贴奖励 💰`;
    } else {
      if (
        data.resultCode == 0 &&
        data.resultData &&
        data.resultData.resBusiCode == 15
      ) {
        msg = "京东金融-金贴: 失败, 原因: 已签过 ⚠️";
      } else if (body.match(/未实名/)) {
        msg = "京东金融-金贴: 失败, 账号未实名 ⚠️";
      } else if (data.resultCode == 3) {
        msg = "京东金融-金贴: 失败, 原因: Cookie失效‼️";
      } else {
        const ng =
          (data.resultData && data.resultData.resBusiMsg) || data.resultMsg;
        msg = `京东金融-金贴: 失败, ${`原因: ${ng || `未知`}`} ⚠️`;
      }
    }
  }).catch((err) => {
    msg = `京东金融-金贴请求失败!\n${err}`;
  })
  $.info(msg);
  return msg;
}

async function jdCash() {
  let msg = "";
  const req = {
    url: "https://api.m.jd.com/client.action?functionId=cash_sign&body=%7B%22remind%22%3A0%2C%22inviteCode%22%3A%22%22%2C%22type%22%3A0%2C%22breakReward%22%3A0%7D&client=apple&clientVersion=9.0.8&openudid=1fce88cd05c42fe2b054e846f11bdf33f016d676&sign=7e2f8bcec13978a691567257af4fdce9&st=1596954745073&sv=111",
    headers: {
      Cookie: COOKIE,
    },
  };
  await $.http.get(req).then(({ body }) => {
    const data = JSON.parse(body);
    if (data.data.success && data.data.result) {
      msg = `京东商城-现金: 成功, 明细: ${data.data.result.signCash || `无`
        }现金 💰`;
    } else {
      if (body.match(/\"bizCode\":201|已经签过/)) {
        msg = "京东商城-现金: 失败, 原因: 已签过 ⚠️";
      } else if (body.match(/\"code\":300|退出登录/)) {
        msg = "京东商城-现金: 失败, 原因: Cookie失效‼️";
      } else {
        msg = "京东商城-现金: 失败, 原因: 未知 ⚠️";
      }
    }
  }).catch((err) => {
    msg = `金贴请求失败!\n${err}`
  })
  $.info(msg);
  return msg;
}
// 金融京豆-双签
async function jrBeanDouble() {
  let msg = "";
  const req = {
    url: "https://nu.jr.jd.com/gw/generic/jrm/h5/m/process",
    headers: {
      Cookie: COOKIE,
    },
    body: `reqData=${encodeURIComponent(
      `{"actCode":"F68B2C3E71","type":3,"frontParam":{"belong":"jingdou"}}`
    )}`,
  };
  await $.http.post(req).then(({ body }) => {
    const data = JSON.parse(body);
    if (data.resultCode == 0) {
      if (data.resultData.data.businessData != null) {
        if (!body.match(/"businessCode":"30\dss?q"/)) {
          let count = body.match(/\"count\":\"?(\d.*?)\"?,/);
          count = count ? count[1] : 0;
          msg = `金融京豆-双签: 成功, 明细: ${count || `无`}京豆 🐶`;
        } else {
          const es = data.resultData.data.businessMsg;
          const ep = data.resultData.data.businessData.businessMsg;
          const tp = body.match(/已领取|300ss?q/)
            ? `已签过`
            : `${ep || es || data.resultMsg || `未知`}`;
          msg = `金融京豆-双签: 失败, 原因: ${tp} ⚠️`;
        }
      } else {
        msg = `金融京豆-双签: 失败, 原因: 领取异常 ⚠️`;
      }
    } else {
      const redata = typeof data.resultData == "string" ? data.resultData : "";
      msg = `金融京豆-双签: 失败, ${data.resultCode == 3
        ? `原因: Cookie失效‼️`
        : `${redata || "原因: 未知 ⚠️"}`
        }`;
    }
  }).catch((err) => {
    msg = `金贴请求失败!\n${err}`;
  })
  $.info(msg);
  return msg;
}

async function TotalCash() {
  let msg = "";
  const req = {
    url: "https://api.m.jd.com/client.action?functionId=myhongbao_balance",
    headers: {
      Cookie: COOKIE,
    },
    body: "body=%7B%22fp%22%3A%22-1%22%2C%22appToken%22%3A%22apphongbao_token%22%2C%22childActivityUrl%22%3A%22-1%22%2C%22country%22%3A%22cn%22%2C%22openId%22%3A%22-1%22%2C%22childActivityId%22%3A%22-1%22%2C%22applicantErp%22%3A%22-1%22%2C%22platformId%22%3A%22appHongBao%22%2C%22isRvc%22%3A%22-1%22%2C%22orgType%22%3A%222%22%2C%22activityType%22%3A%221%22%2C%22shshshfpb%22%3A%22-1%22%2C%22platformToken%22%3A%22apphongbao_token%22%2C%22organization%22%3A%22JD%22%2C%22pageClickKey%22%3A%22-1%22%2C%22platform%22%3A%221%22%2C%22eid%22%3A%22-1%22%2C%22appId%22%3A%22appHongBao%22%2C%22childActiveName%22%3A%22-1%22%2C%22shshshfp%22%3A%22-1%22%2C%22jda%22%3A%22-1%22%2C%22extend%22%3A%22-1%22%2C%22shshshfpa%22%3A%22-1%22%2C%22activityArea%22%3A%22-1%22%2C%22childActivityTime%22%3A%22-1%22%7D&client=apple&clientVersion=8.5.0&d_brand=apple&networklibtype=JDNetworkBaseAF&openudid=1fce88cd05c42fe2b054e846f11bdf33f016d676&sign=fdc04c3ab0ee9148f947d24fb087b55d&st=1581245397648&sv=120",
  };
  await $.http.post(req).then(({ body }) => {
    if (body.match(/(\"totalBalance\":\d+)/)) {
      const data = JSON.parse(body);
      msg = `京东-总红包: ${data.totalBalance}`;
    } else {
      msg = "京东-总红包查询失败 ";
    }
  }).catch((err) => {
    msg = `京东请求失败!\n${err}`;
  })
  $.info(msg);
  return msg;
}

async function TotalBean() {
  let msg = "";
  const req = {
    url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
    headers: {
      Cookie: COOKIE,
    },
  };
  await $.http.get(req).then(({ body }) => {
    const data = JSON.parse(body);
    if (data.msg == "success" && data.retcode == 0) {
      msg = `京东-总京豆: ${data.data.assetInfo.beanNum}`;
    } else {
      msg = "京东-总京豆查询失败";
    }
  }).catch((err) => {
    msg = `京东请求失败!\n${err}`;
  })
  $.info(msg);
  return msg;
}

async function TotalSubsidy() {
  let msg = "";
  const req = {
    url: "https://ms.jr.jd.com/gw/generic/uc/h5/m/mySubsidyBalance",
    headers: {
      Cookie: COOKIE,
      Referer:
        "https://active.jd.com/forever/cashback/index?channellv=wojingqb",
    },
  };
  await $.http.get(req).then(({ body }) => {
    const data = JSON.parse(body);
    if (data.resultCode == 0 && data.resultData && data.resultData.data) {
      msg = `京东-总金贴查: ${data.resultData.data.balance}`;
    } else {
      msg = "京东-总金贴查询失败";
    }
  }).catch((err) => {
    msg = `京东请求失败!\n${err}`;
  })
  $.info(msg);
  return msg;
}

async function TotalMoney() {
  let msg = "";
  const req = {
    url: "https://api.m.jd.com/client.action?functionId=cash_exchangePage&body=%7B%7D&build=167398&client=apple&clientVersion=9.1.9&openudid=1fce88cd05c42fe2b054e846f11bdf33f016d676&sign=762a8e894dea8cbfd91cce4dd5714bc5&st=1602179446935&sv=102",
    headers: {
      Cookie: COOKIE,
    },
  };
  await $.http.get(req).then(({ body }) => {
    const data = JSON.parse(body);
    if (
      data.code == 0 &&
      data.data &&
      data.data.bizCode == 0 &&
      data.data.result
    ) {
      msg = `京东-总现金: ${data.data.result.totalMoney}`;
    } else {
      msg = "京东-总现金查询失败";
    }
  }).catch((err) => {
    msg = `京东请求失败!\n${err}`;
  })
  $.info(msg);
  return msg;
}


function ENV() { const e = "function" == typeof require && "undefined" != typeof $jsbox; return { isQX: "undefined" != typeof $task, isLoon: "undefined" != typeof $loon, isSurge: "undefined" != typeof $httpClient && "undefined" != typeof $utils, isBrowser: "undefined" != typeof document, isNode: "function" == typeof require && !e, isJSBox: e, isRequest: "undefined" != typeof $request, isScriptable: "undefined" != typeof importModule } } function HTTP(e = { baseURL: "" }) { const { isQX: t, isLoon: s, isSurge: o, isScriptable: n, isNode: i, isBrowser: r } = ENV(), u = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/; const a = {}; return ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"].forEach(h => a[h.toLowerCase()] = (a => (function (a, h) { h = "string" == typeof h ? { url: h } : h; const d = e.baseURL; d && !u.test(h.url || "") && (h.url = d ? d + h.url : h.url), h.body && h.headers && !h.headers["Content-Type"] && (h.headers["Content-Type"] = "application/x-www-form-urlencoded"); const l = (h = { ...e, ...h }).timeout, c = { onRequest: () => { }, onResponse: e => e, onTimeout: () => { }, ...h.events }; let f, p; if (c.onRequest(a, h), t) f = $task.fetch({ method: a, ...h }); else if (s || o || i) f = new Promise((e, t) => { (i ? require("request") : $httpClient)[a.toLowerCase()](h, (s, o, n) => { s ? t(s) : e({ statusCode: o.status || o.statusCode, headers: o.headers, body: n }) }) }); else if (n) { const e = new Request(h.url); e.method = a, e.headers = h.headers, e.body = h.body, f = new Promise((t, s) => { e.loadString().then(s => { t({ statusCode: e.response.statusCode, headers: e.response.headers, body: s }) }).catch(e => s(e)) }) } else r && (f = new Promise((e, t) => { fetch(h.url, { method: a, headers: h.headers, body: h.body }).then(e => e.json()).then(t => e({ statusCode: t.status, headers: t.headers, body: t.data })).catch(t) })); const y = l ? new Promise((e, t) => { p = setTimeout(() => (c.onTimeout(), t(`${a} URL: ${h.url} exceeds the timeout ${l} ms`)), l) }) : null; return (y ? Promise.race([y, f]).then(e => (clearTimeout(p), e)) : f).then(e => c.onResponse(e)) })(h, a))), a } function API(e = "untitled", t = !1) { const { isQX: s, isLoon: o, isSurge: n, isNode: i, isJSBox: r, isScriptable: u } = ENV(); return new class { constructor(e, t) { this.name = e, this.debug = t, this.http = HTTP(), this.env = ENV(), this.node = (() => { if (i) { return { fs: require("fs") } } return null })(), this.initCache(); Promise.prototype.delay = function (e) { return this.then(function (t) { return ((e, t) => new Promise(function (s) { setTimeout(s.bind(null, t), e) }))(e, t) }) } } initCache() { if (s && (this.cache = JSON.parse($prefs.valueForKey(this.name) || "{}")), (o || n) && (this.cache = JSON.parse($persistentStore.read(this.name) || "{}")), i) { let e = "root.json"; this.node.fs.existsSync(e) || this.node.fs.writeFileSync(e, JSON.stringify({}), { flag: "wx" }, e => console.log(e)), this.root = {}, e = `${this.name}.json`, this.node.fs.existsSync(e) ? this.cache = JSON.parse(this.node.fs.readFileSync(`${this.name}.json`)) : (this.node.fs.writeFileSync(e, JSON.stringify({}), { flag: "wx" }, e => console.log(e)), this.cache = {}) } } persistCache() { const e = JSON.stringify(this.cache, null, 2); s && $prefs.setValueForKey(e, this.name), (o || n) && $persistentStore.write(e, this.name), i && (this.node.fs.writeFileSync(`${this.name}.json`, e, { flag: "w" }, e => console.log(e)), this.node.fs.writeFileSync("root.json", JSON.stringify(this.root, null, 2), { flag: "w" }, e => console.log(e))) } write(e, t) { if (this.log(`SET ${t}`), -1 !== t.indexOf("#")) { if (t = t.substr(1), n || o) return $persistentStore.write(e, t); if (s) return $prefs.setValueForKey(e, t); i && (this.root[t] = e) } else this.cache[t] = e; this.persistCache() } read(e) { return this.log(`READ ${e}`), -1 === e.indexOf("#") ? this.cache[e] : (e = e.substr(1), n || o ? $persistentStore.read(e) : s ? $prefs.valueForKey(e) : i ? this.root[e] : void 0) } delete(e) { if (this.log(`DELETE ${e}`), -1 !== e.indexOf("#")) { if (e = e.substr(1), n || o) return $persistentStore.write(null, e); if (s) return $prefs.removeValueForKey(e); i && delete this.root[e] } else delete this.cache[e]; this.persistCache() } notify(e, t = "", a = "", h = {}) { const d = h["open-url"], l = h["media-url"]; if (s && $notify(e, t, a, h), n && $notification.post(e, t, a + `${l ? "\n多媒体:" + l : ""}`, { url: d }), o) { let s = {}; d && (s.openUrl = d), l && (s.mediaUrl = l), "{}" === JSON.stringify(s) ? $notification.post(e, t, a) : $notification.post(e, t, a, s) } if (i || u) { const s = a + (d ? `\n点击跳转: ${d}` : "") + (l ? `\n多媒体: ${l}` : ""); if (r) { require("push").schedule({ title: e, body: (t ? t + "\n" : "") + s }) } else console.log(`${e}\n${t}\n${s}\n\n`) } } log(e) { this.debug && console.log(`[${this.name}] LOG: ${this.stringify(e)}`) } info(e) { console.log(`[${this.name}] INFO: ${this.stringify(e)}`) } error(e) { console.log(`[${this.name}] ERROR: ${this.stringify(e)}`) } wait(e) { return new Promise(t => setTimeout(t, e)) } done(e = {}) { s || o || n ? $done(e) : i && !r && "undefined" != typeof $context && ($context.headers = e.headers, $context.statusCode = e.statusCode, $context.body = e.body) } stringify(e) { if ("string" == typeof e || e instanceof String) return e; try { return JSON.stringify(e, null, 2) } catch (e) { return "[object Object]" } } }(e, t) }