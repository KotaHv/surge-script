//https://api-ipv6.app.acfun.cn/rest/app/user/getSignInInfos
const cookieKey = "cookie-acfun";
const title = "Acfun";

if (typeof $request !== 'undefined') {
    getCookie();
    $done();
} else {
    signIn().then(() => $done());
}


function getCookie() {
    console.log('开始获取cookie');
    let msg = "写入cookie失败\n配置错误, 无法读取请求头";
    if ($request.headers) {
        const regex = /acPasstoken=.+?; auth_key=.+?;/;
        let cookie = $request.headers['Cookie'] ? $request.headers['Cookie'] : "";
        cookie = regex.exec(cookie);
        if (cookie !== null) {
            cookie = cookie[0];
            const oldCookie = $persistentStore.read(cookieKey);
            msg = oldCookie ? "更新" : "写入";
            if (cookie != oldCookie) {
                const status = $persistentStore.write(cookie, cookieKey);
                msg += status ? 'Cookie成功 🎉' : 'Cookie失败‼️';
            } else {
                $done();
                return;
            }
        }
    }
    $notification.post(title, "", msg);
}


async function signIn() {
    const request = Request();
    const cookie = $persistentStore.read(cookieKey);
    const req = {
        url: 'https://www.acfun.cn/rest/pc-direct/user/signIn',
        headers: {
            Cookie: cookie,
            'User-Agent': 'AcFun/6.62.0 (iPhone; iOS 15.4.1; Scale/3.00)',
            'Accept': 'application/json'
        }
    };
    const {
        err,
        body
    } = await request.get(req);
    let msg = '';
    if (err) {
        msg = `请求失败!\n${err}`;
    } else {
        const data = JSON.parse(body);
        if (data.result == 0) {
            msg = data.msg;
        } else if (data.error_msg) {
            msg = data.error_msg;
        } else {
            msg = "签到失败，cookie过期" + body;
        }
    }
    console.log(msg);
    $notification.post(title, "", msg);
}

function Request() {
    return new(class {
        request(obj, method) {
            obj.headers['User-Agent'] = 'JD4iPhone/167169 (iPhone; iOS 13.4.1; Scale/3.00)';
            if (method == 'post' && obj.body) obj.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            return new Promise(resolve => {
                $httpClient[method](obj, (err, resp, body) => {
                    resolve({
                        err,
                        resp,
                        body
                    })
                })
            })
        }
        get(obj) {
            return this.request(obj, 'get');;
        }
        post(obj) {
            return this.request(obj, 'post');
        }
    })();
}