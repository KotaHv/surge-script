const title = "京东比价";
const $ = new Env(title);
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
  });
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
    summary += `\n${item.Name}   ${isNaN(price) ? "-" : "¥" + price}   ${
      item.Date
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

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,n]=i.split("@"),a={url:`http://${n}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),n=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(n);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t&&t.error||"UndefinedError"));else if(this.isNode()){let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:n}=t,a=s.decode(n,this.encoding);e(null,{status:i,statusCode:r,headers:o,rawBody:n,body:a},a)},t=>{const{message:i,response:r}=t;e(i,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});else if(this.isQuanX())t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t&&t.error||"UndefinedError"));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[s](r,o).then(t=>{const{statusCode:s,statusCode:r,headers:o,rawBody:n}=t,a=i.decode(n,this.encoding);e(null,{status:s,statusCode:r,headers:o,rawBody:n,body:a},a)},t=>{const{message:s,response:r}=t;e(s,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}queryStr(t){let e="";for(const s in t){let i=t[s];null!=i&&""!==i&&("object"==typeof i&&(i=JSON.stringify(i)),e+=`${s}=${i}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.isSurge()||this.isQuanX()||this.isLoon()?$done(t):this.isNode()&&process.exit(1)}}(t,e)}
