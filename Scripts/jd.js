const title = "京东签到";
const jdCookieKey = `@${title}.jdCookie`;
const bodyKey = `@${title}.jrBody`;
const $ = new Env(title);
const COOKIE = $.getdata(jdCookieKey);
const BODY = $.getdata(bodyKey);

if (typeof $request !== "undefined") {
  getCookie();
  $.done();
} else {
  checkin().then(() => $.done());
}

function getCookie() {
  $.log($request.url);
  let msg = `获取cookie失败\n${$request.url}`;
  if ($request.headers) {
    let cookie = $request.headers.Cookie || $request.headers.cookie || "";
    if (
      /^https:\/\/(me-|)api(\.m|)\.jd\.com\/(client\.|user_new)/.test(
        $request.url
      )
    ) {
      cookie = cookie.match(/(pt_key|pt_pin)=.+?;/g);
      $.log("正在获取京东cookie", $request.url, cookie);
      if (cookie && cookie.length == 2) {
        cookie = cookie.join("");
        const oldCookie = COOKIE;
        msg = oldCookie ? "更新" : "写入";
        if (cookie != oldCookie) {
          $.setdata(cookie, jdCookieKey);
          msg += "Cookie成功 🎉";
        } else {
          $.log("已是最新Cookie");
          return;
        }
      } else {
        msg = "写入Cookie失败, 关键值缺失\n可能原因: 非网页获取 ‼️";
        $.logErr(cookie);
      }
    } else if (
      /^https:\/\/ms\.jr\.jd\.com\/gw\/generic\/hy\/h5\/m\/(appSign|jrSign)\?/.test(
        $request.url
      )
    ) {
      if ($request.body) {
        $.setdata($request.body, bodyKey);
        msg = "写入京东金融body数据成功 🎉";
      } else {
        msg = "获取京东金融body数据失败‼️";
      }
    }
  }
  $.log(msg);
  $.msg(title, "", msg);
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
  $.msg(title, "", msg);
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
  await $.http
    .post(jdRequest(req))
    .then(({ body }) => {
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
    })
    .catch((err) => {
      msg = `京东请求失败!\n${err}`;
    });
  $.log(msg);
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
  await $.http
    .post(jdRequest(req))
    .then(({ body }) => {
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
          msg = `京东金融-金贴: 失败, ${`原因: resBusiMsg: ${
            data.resultData && data.resultData.resBusiMsg
          };resultMsg: ${data.resultMsg}`} ⚠️`;
        }
      }
    })
    .catch((err) => {
      msg = `京东金融-金贴请求失败!\n${err}`;
    });
  $.log(msg);
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
  await $.http
    .get(jdRequest(req))
    .then(({ body }) => {
      const data = JSON.parse(body);
      if (data.data.success && data.data.result) {
        msg = `京东商城-现金: 成功, 明细: ${
          data.data.result.signCash || `无`
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
    })
    .catch((err) => {
      msg = `金贴请求失败!\n${err}`;
    });
  $.log(msg);
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
  await $.http
    .post(jdRequest(req))
    .then(({ body }) => {
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
        const redata =
          typeof data.resultData == "string" ? data.resultData : "";
        msg = `金融京豆-双签: 失败, ${
          data.resultCode == 3
            ? `原因: Cookie失效‼️`
            : `${redata || "原因: 未知 ⚠️"}`
        }`;
      }
    })
    .catch((err) => {
      msg = `金贴请求失败!\n${err}`;
    });
  $.log(msg);
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
  await $.http
    .post(jdRequest(req))
    .then(({ body }) => {
      if (body.match(/(\"totalBalance\":\d+)/)) {
        const data = JSON.parse(body);
        msg = `京东-总红包: ${data.totalBalance}`;
      } else {
        msg = "京东-总红包查询失败 ";
      }
    })
    .catch((err) => {
      msg = `京东请求失败!\n${err}`;
    });
  $.log(msg);
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
  await $.http
    .get(jdRequest(req))
    .then(({ body }) => {
      const data = JSON.parse(body);
      if (data.msg == "success" && data.retcode == 0) {
        msg = `京东-总京豆: ${data.data.assetInfo.beanNum}`;
      } else {
        msg = "京东-总京豆查询失败";
      }
    })
    .catch((err) => {
      msg = `京东请求失败!\n${err}`;
    });
  $.log(msg);
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
  await $.http
    .get(jdRequest(req))
    .then(({ body }) => {
      const data = JSON.parse(body);
      if (data.resultCode == 0 && data.resultData && data.resultData.data) {
        msg = `京东-总金贴查: ${data.resultData.data.balance}`;
      } else {
        msg = "京东-总金贴查询失败";
      }
    })
    .catch((err) => {
      msg = `京东请求失败!\n${err}`;
    });
  $.log(msg);
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
  await $.http
    .get(jdRequest(req))
    .then(({ body }) => {
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
    })
    .catch((err) => {
      msg = `京东请求失败!\n${err}`;
    });
  $.log(msg);
  return msg;
}

function jdRequest(request) {
  request.headers["User-Agent"] =
    "JD4iPhone/167169 (iPhone; iOS 13.4.1; Scale/3.00)";
  return request;
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,n]=i.split("@"),a={url:`http://${n}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),n=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(n);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t&&t.error||"UndefinedError"));else if(this.isNode()){let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:n}=t,a=s.decode(n,this.encoding);e(null,{status:i,statusCode:r,headers:o,rawBody:n,body:a},a)},t=>{const{message:i,response:r}=t;e(i,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});else if(this.isQuanX())t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t&&t.error||"UndefinedError"));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[s](r,o).then(t=>{const{statusCode:s,statusCode:r,headers:o,rawBody:n}=t,a=i.decode(n,this.encoding);e(null,{status:s,statusCode:r,headers:o,rawBody:n,body:a},a)},t=>{const{message:s,response:r}=t;e(s,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}queryStr(t){let e="";for(const s in t){let i=t[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),e+=`${s}=${i}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.isSurge()||this.isQuanX()||this.isLoon()?$done(t):this.isNode()&&process.exit(1)}}(t,e)}
