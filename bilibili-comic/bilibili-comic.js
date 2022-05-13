const cookieKey = "cookie-bilibili-comic";
const title = "哔哩哔哩漫画";

if (typeof $request !== "undefined") {
  getCookie();
  $done();
} else {
  clockIn().then(() => $done());
}

function getCookie() {
  const regex = /SESSDATA=.+?;/;
  let msg = "写入Cookie失败\n配置错误, 无法读取请求头";
  if ($request.headers) {
    let cookie = $request.headers["Cookie"] ? $request.headers["Cookie"] : "";
    cookie = regex.exec(cookie);
    if (cookie !== null) {
      cookie = cookie[0];
      const oldCookie = $persistentStore.read(cookieKey);
      msg = oldCookie ? "更新" : "写入";
      if (cookie != oldCookie) {
        const status = $persistentStore.write(cookie, cookieKey);
        msg += status ? "Cookie成功 🎉" : "Cookie失败‼️";
      } else {
        $done();
        return;
      }
    }
  }
  $notification.post(title, "", msg);
}

async function clockIn() {
  const request = Request();
  const cookie = $persistentStore.read(cookieKey);
  const req = {
    url: "https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn",
    headers: {
      Cookie: cookie,
    },
    body: "platform=ios",
  };
  const { err, resp, body } = await request.post(req);
  // console.log(resp);
  let msg = "";
  if (err) {
    msg = `请求失败!\n${err}`;
  } else if (resp.status === 200) {
    msg = "打卡成功！🎉";
  } else if (/duplicate/.test(body)) {
    msg = "今日已签过 ⚠️";
  } else if (/uid must/.test(body)) {
    msg = "Cookie失效 ‼️‼️";
  } else {
    msg = `签到失败 ‼️\n${body}`;
  }
  console.log(msg);
  $notification.post(title, "", msg);
}

function Request() {
  return new (class {
    request(obj, method) {
      return new Promise((resolve) => {
        $httpClient[method](obj, (err, resp, body) => {
          resolve({
            err,
            resp,
            body,
          });
        });
      });
    }
    get(obj) {
      return this.request(obj, "get");
    }
    post(obj) {
      return this.request(obj, "post");
    }
  })();
}
