const title = "京东签到";
const jdCookieKey = "cookie-jd";
const bodyKey = "body-jr"
const COOKIE = $persistentStore.read(jdCookieKey);
const BODY = $persistentStore.read(bodyKey);
const request = Request();

if (typeof $request !== 'undefined') {
    getCookie();
    $done();
} else {
    checkin().then(() => $done());
}

function getCookie() {
    let msg = `获取cookie失败\n${$request.url}`;
    if ($request.headers) {
        let cookie = $request.headers['Cookie'] ? $request.headers['Cookie'] : "";
        if (/^https:\/\/(me-|)api(\.m|)\.jd\.com\/(client\.|user_new)/.test($request.url)) {
            cookie = cookie.match(/(pt_key|pt_pin)=.+?;/g);
            console.log('正在获取京东cookie', $request.url, cookie);
            if (cookie && cookie.length == 2) {
                cookie = cookie.join('');
                const oldCookie = COOKIE;
                msg = oldCookie ? "更新" : "写入";
                if (cookie != oldCookie) {
                    const status = $persistentStore.write(cookie, jdCookieKey);
                    msg += status ? 'Cookie成功 🎉' : 'Cookie失败‼️';
                } else {
                    $done();
                    return;
                }

            } else {
                msg = "写入Cookie失败, 关键值缺失\n可能原因: 非网页获取 ‼️";
            }
        }
        console.log(cookie);
    } else if (/^https:\/\/ms\.jr\.jd\.com\/gw\/generic\/hy\/h5\/m\/(appSign|jrSign)\?/.test($request.url)) {
        if ($request.body) {
            const status = $persistentStore.write($request.body, bodyKey);
            msg = status ? '写入京东金融body数据成功 🎉' : '写入京东金融body数据失败‼️';
        } else {
            msg = "获取京东金融body数据失败‼️";
        }
    }
    $notification.post(title, "", msg);
}

async function checkin() {
    let msg = '';
    msg += await jdBean() + '\n'; // 京豆
    msg += await jrSubsidy() + '\n'; // 金融金贴
    msg += await jdCash() + '\n'; // 现金
    msg += await jrBeanDouble() + '\n'; // 金融京豆-双签
    let msg2 = '';
    msg2 += await TotalCash() + '\n';
    msg2 += await TotalBean() + '\n';
    msg2 += await TotalSubsidy() + '\n';
    msg2 += await TotalMoney() + '\n';
    msg = msg2 + msg;
    $notification.post(title, "", msg);
}

async function jdBean() {
    let msg = '';
    const req = {
        url: 'https://api.m.jd.com/client.action',
        headers: {
            Cookie: COOKIE
        },
        body: 'functionId=signBeanIndex&appid=ld'
    };
    const {
        err,
        body
    } = await request.post(req);
    //console.log(resp);
    if (err) {
        msg = `京东请求失败!\n${err}`;
    } else {
        const data = JSON.parse(body);
        if (data.code == 3) {
            msg = "京东商城-京豆: 失败, 原因: Cookie失效‼️";
        } else if (body.match(/跳转至拼图/)) {
            msg = "京东商城-京豆: 失败, 需要拼图验证 ⚠️";
        } else if (body.match(/\"status\":\"?1\"?/)) {
            if (body.match(/dailyAward/)) {
                msg = "京东商城-京豆: 成功, 明细: " + data.data.dailyAward.beanAward.beanCount + "京豆 🐶";
            } else if (body.match(/continuityAward/)) {
                msg = "京东商城-京豆: 成功, 明细: " + data.data.continuityAward.beanAward.beanCount + "京豆 🐶";
            } else if (body.match(/新人签到/)) {
                const quantity = body.match(/beanCount\":\"(\d+)\".+今天/)
                msg = "京东商城-京豆: 成功, 明细: " + (quantity ? quantity[1] : "无") + "京豆 🐶";
            } else {
                msg = "京东商城-京豆: 成功, 明细: 无京豆 🐶";
            }
        } else {
            if (body.match(/(已签到|新人签到)/)) {
                msg = "京东商城-京豆: 失败, 原因: 已签过 ⚠️"
            } else if (body.match(/人数较多|S101/)) {
                msg = "京东商城-京豆: 失败, 签到人数较多 ⚠️"
            } else {
                msg = "京东商城-京豆: 失败, 原因: 未知 ⚠️"
            }
        }
    }
    console.log(msg);
    return msg;
}

async function jrSubsidy() {
    let msg = '';
    const req = {
        url: 'https://ms.jr.jd.com/gw/generic/hy/h5/m/jrSign',
        headers: {
            Cookie: COOKIE
        },
        body: BODY
    };
    const {
        err,
        body
    } = await request.post(req);
    if (err) {
        msg = `京东金融-金贴请求失败!\n${err}`;
    } else {
        const data = JSON.parse(body);
        if (data.resultCode == 0 && data.resultData && data.resultData.resBusiCode == 0) {
            msg = `京东金融-金贴: 成功, 获得金贴奖励 💰`;
        } else {
            if (data.resultCode == 0 && data.resultData && data.resultData.resBusiCode == 15) {
                msg = "京东金融-金贴: 失败, 原因: 已签过 ⚠️"
            } else if (body.match(/未实名/)) {
                msg = "京东金融-金贴: 失败, 账号未实名 ⚠️"
            } else if (data.resultCode == 3) {
                msg = "京东金融-金贴: 失败, 原因: Cookie失效‼️"
            } else {
                const ng = (data.resultData && data.resultData.resBusiMsg) || data.resultMsg
                msg = `京东金融-金贴: 失败, ${`原因: ${ng||`未知`}`} ⚠️`
            }
        }
    }
    console.log(msg);
    return msg;
}

async function jdCash() {
    let msg = '';
    const req = {
        url: 'https://api.m.jd.com/client.action?functionId=cash_sign&body=%7B%22remind%22%3A0%2C%22inviteCode%22%3A%22%22%2C%22type%22%3A0%2C%22breakReward%22%3A0%7D&client=apple&clientVersion=9.0.8&openudid=1fce88cd05c42fe2b054e846f11bdf33f016d676&sign=7e2f8bcec13978a691567257af4fdce9&st=1596954745073&sv=111',
        headers: {
            Cookie: COOKIE
        }
    };
    const {
        err,
        body
    } = await request.get(req);
    //console.log(resp);
    if (err) {
        msg = `金贴请求失败!\n${err}`;
    } else {
        const data = JSON.parse(body);
        if (data.data.success && data.data.result) {
            msg = `京东商城-现金: 成功, 明细: ${data.data.result.signCash||`无`}现金 💰`;
        } else {
            if (body.match(/\"bizCode\":201|已经签过/)) {
                msg = "京东商城-现金: 失败, 原因: 已签过 ⚠️"
            } else if (body.match(/\"code\":300|退出登录/)) {
                msg = "京东商城-现金: 失败, 原因: Cookie失效‼️"
            } else {
                msg = "京东商城-现金: 失败, 原因: 未知 ⚠️"
            }
        }
    }
    console.log(msg);
    return msg;
}
// 金融京豆-双签
async function jrBeanDouble() {
    let msg = '';
    const req = {
        url: "https://nu.jr.jd.com/gw/generic/jrm/h5/m/process",
        headers: {
            Cookie: COOKIE
        },
        body: `reqData=${encodeURIComponent(`{"actCode":"F68B2C3E71","type":3,"frontParam":{"belong":"jingdou"}}`)}`
    };
    const {
        err,
        body
    } = await request.post(req);
    if (err) {
        msg = `金贴请求失败!\n${err}`;
    } else {
        const data = JSON.parse(body);
        if (data.resultCode == 0) {
            if (data.resultData.data.businessData != null) {
                if (!body.match(/"businessCode":"30\dss?q"/)) {
                    let count = body.match(/\"count\":\"?(\d.*?)\"?,/)
                    count = count ? count[1] : 0;
                    msg = `金融京豆-双签: 成功, 明细: ${count||`无`}京豆 🐶`;
                } else {
                    const es = data.resultData.data.businessMsg
                    const ep = data.resultData.data.businessData.businessMsg
                    const tp = body.match(/已领取|300ss?q/) ? `已签过` : `${ep||es||data.resultMsg||`未知`}`
                    msg = `金融京豆-双签: 失败, 原因: ${tp} ⚠️`;
                }

            } else {
                msg = `金融京豆-双签: 失败, 原因: 领取异常 ⚠️`;
            }
        } else {
            const redata = typeof (data.resultData) == 'string' ? data.resultData : ''
            msg = `金融京豆-双签: 失败, ${data.resultCode==3?`原因: Cookie失效‼️`:`${redata||'原因: 未知 ⚠️'}`}`
        }
    }
    console.log(msg);
    return msg;
}

async function TotalCash() {
    let msg = '';
    const req = {
        url: 'https://api.m.jd.com/client.action?functionId=myhongbao_balance',
        headers: {
            Cookie: COOKIE
        },
        body: "body=%7B%22fp%22%3A%22-1%22%2C%22appToken%22%3A%22apphongbao_token%22%2C%22childActivityUrl%22%3A%22-1%22%2C%22country%22%3A%22cn%22%2C%22openId%22%3A%22-1%22%2C%22childActivityId%22%3A%22-1%22%2C%22applicantErp%22%3A%22-1%22%2C%22platformId%22%3A%22appHongBao%22%2C%22isRvc%22%3A%22-1%22%2C%22orgType%22%3A%222%22%2C%22activityType%22%3A%221%22%2C%22shshshfpb%22%3A%22-1%22%2C%22platformToken%22%3A%22apphongbao_token%22%2C%22organization%22%3A%22JD%22%2C%22pageClickKey%22%3A%22-1%22%2C%22platform%22%3A%221%22%2C%22eid%22%3A%22-1%22%2C%22appId%22%3A%22appHongBao%22%2C%22childActiveName%22%3A%22-1%22%2C%22shshshfp%22%3A%22-1%22%2C%22jda%22%3A%22-1%22%2C%22extend%22%3A%22-1%22%2C%22shshshfpa%22%3A%22-1%22%2C%22activityArea%22%3A%22-1%22%2C%22childActivityTime%22%3A%22-1%22%7D&client=apple&clientVersion=8.5.0&d_brand=apple&networklibtype=JDNetworkBaseAF&openudid=1fce88cd05c42fe2b054e846f11bdf33f016d676&sign=fdc04c3ab0ee9148f947d24fb087b55d&st=1581245397648&sv=120"
    };
    const {
        err,
        body
    } = await request.post(req);
    if (err) {
        msg = `京东请求失败!\n${err}`;
    } else {
        if (body.match(/(\"totalBalance\":\d+)/)) {
            const data = JSON.parse(body)
            msg = `京东-总红包: ${data.totalBalance}`
        } else {
            msg = "京东-总红包查询失败 "
        }
    }
    console.log(msg);
    return msg;
}

async function TotalBean() {

    let msg = '';
    const req = {
        url: 'https://me-api.jd.com/user_new/info/GetJDUserInfoUnion',
        headers: {
            Cookie: COOKIE
        }
    };
    const {
        err,
        body
    } = await request.get(req);
    if (err) {
        msg = `京东请求失败!\n${err}`;
    } else {
        const data = JSON.parse(body);
        if (data.msg == 'success' && data.retcode == 0) {
            msg = `京东-总京豆: ${data.data.assetInfo.beanNum}`;
        } else {
            msg = '京东-总京豆查询失败';
        }
    }
    console.log(msg);
    return msg;
}

async function TotalSubsidy() {
    let msg = '';
    const req = {
        url: 'https://ms.jr.jd.com/gw/generic/uc/h5/m/mySubsidyBalance',
        headers: {
            Cookie: COOKIE,
            Referer: 'https://active.jd.com/forever/cashback/index?channellv=wojingqb',
        }
    };
    const {
        err,
        body
    } = await request.get(req);
    if (err) {
        msg = `京东请求失败!\n${err}`;
    } else {
        const data = JSON.parse(body);
        if (data.resultCode == 0 && data.resultData && data.resultData.data) {
            msg = `京东-总金贴查: ${data.resultData.data.balance}`
        } else {
            msg = '京东-总金贴查询失败'
        }
    }
    console.log(msg);
    return msg;
}


async function TotalMoney() {
    let msg = '';
    const req = {
        url: 'https://api.m.jd.com/client.action?functionId=cash_exchangePage&body=%7B%7D&build=167398&client=apple&clientVersion=9.1.9&openudid=1fce88cd05c42fe2b054e846f11bdf33f016d676&sign=762a8e894dea8cbfd91cce4dd5714bc5&st=1602179446935&sv=102',
        headers: {
            Cookie: COOKIE
        }
    };
    const {
        err,
        body
    } = await request.get(req);
    if (err) {
        msg = `京东请求失败!\n${err}`;
    } else {
        const data = JSON.parse(body);
        if (data.code == 0 && data.data && data.data.bizCode == 0 && data.data.result) {
            msg = `京东-总现金: ${data.data.result.totalMoney}`;
        } else {
            msg = '京东-总现金查询失败';
        }
    }
    console.log(msg);
    return msg;
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