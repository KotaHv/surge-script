const URL = $request.url;

if (URL.includes('serverConfig')) {
    const obj = JSON.parse($response.body);
    delete obj.serverConfig.httpdns;
    delete obj.serverConfig.dnsvip;
    delete obj.serverConfig.dnsvip_v6;
    $done({
        body: JSON.stringify(obj)
    });
}

if (URL.includes('basicConfig')) {
    const obj = JSON.parse($response.body);
    if (obj.data.JDHttpToolKit) {
        delete obj.data.JDHttpToolKit.httpdns;
        delete obj.data.JDHttpToolKit.dnsvipV6;
    }
    if (obj.data.jCommandConfig) {
        delete obj.data.jCommandConfig.httpdnsConfig;
    }
    $done({
        body: JSON.stringify(obj)
    });
}

if (URL.includes('wareBusiness') || URL.includes('pingou_item')) {
    const obj = JSON.parse($response.body);
    const floors = obj.floors;
    const commodity_info = floors[floors.length - 1];
    const url =
        URL.includes('pingou_item') ?
        obj.domain.h5Url :
        URL.includes('wareBusiness.style') ?
        obj.others.property.shareUrl :
        commodity_info.data.property.shareUrl;
    fetch_history_price(url).then((data) => {
        if (!data) {
            $done();
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

            const lower = lowerMsgs(data.single)
            const detail = priceSummary(data)
            const tip = data.PriceRemark.Tip
            lowerword.data.ad.adword = `${lower}\n${tip}${detail}`;
        }
        if (data.ok == 0 && data.msg.length > 0) {
            lowerword.data.ad.adword = `⚠️ ${data.msg}`;
        }
        floors.insert(bestIndex, lowerword);
        $done({
            body: JSON.stringify(obj)
        });
    })
}

async function fetch_history_price(url) {
    const request = Request();
    const req = {
        url: "https://apapia-history.manmanbuy.com/ChromeWidgetServices/WidgetServices.ashx",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 - mmbWebBrowse - ios"
        },
        body: "methodName=getHistoryTrend&p_url=" + encodeURIComponent(url)
    }
    const {
        body
    } = await request.post(req);
    return JSON.parse(body);
}

function lowerMsgs(data) {
    const lower = data.lowerPriceyh
    const lowerDate = dateFormat(data.lowerDateyh)
    const lowerMsg = "🍵 历史最低到手价：¥" + String(lower) + ` (${lowerDate}) `
    return lowerMsg
}

function priceSummary(data) {
    let summary = ""
    let listPriceDetail = data.PriceRemark.ListPriceDetail.slice(0, 4)
    let list = listPriceDetail.concat(historySummary(data.single))
    list.forEach((item, index) => {
        if (item.Name == "双11价格") {
            item.Name = "双十一价格"
        } else if (item.Name == "618价格") {
            item.Name = "六一八价格"
        }
        let price = String(parseInt(item.Price.substr(1)));
        summary += `\n${item.Name}   ${isNaN(price) ? "-" : "¥" + price}   ${item.Date}   ${item.Difference}`
    })
    return summary
}

function historySummary(single) {
    let list = JSON.parse("[" + single.jiagequshiyh + "]");
    const currentDate = formatTime(list[list.length - 1][0]);
    const currentPrice = list[list.length - 1][1];
    const lowest30 = {
        Name: "三十天最低",
        Price: `¥${String(currentPrice)}`,
        Date: currentDate,
        price: currentPrice
    }
    const lowest90 = {
        Name: "九十天最低",
        Price: `¥${String(currentPrice)}`,
        Date: currentDate,
        price: currentPrice
    }
    const lowest180 = {
        Name: "一百八最低",
        Price: `¥${String(currentPrice)}`,
        Date: currentDate,
        price: currentPrice
    }
    const lowest360 = {
        Name: "三百六最低",
        Price: `¥${String(currentPrice)}`,
        Date: currentDate,
        price: currentPrice
    }
    list = list.reverse().slice(1, 360);
    list.forEach((item, index) => {
        const date = formatTime(item[0]);
        const price = parseFloat(item[1]);

        if (index < 30 && price < lowest30.price) {
            lowest30.price = price
            lowest30.Price = `¥${String(price)}`
            lowest30.Date = date
            lowest30.Difference = difference(currentPrice, price)
        }
        if (index < 90 && price < lowest90.price) {
            lowest90.price = price
            lowest90.Price = `¥${String(price)}`
            lowest90.Date = date
            lowest90.Difference = difference(currentPrice, price)
        }
        if (index < 180 && price < lowest180.price) {
            lowest180.price = price
            lowest180.Price = `¥${String(price)}`
            lowest180.Date = date
            lowest180.Difference = difference(currentPrice, price)
        }
        if (index < 360 && price < lowest360.price) {
            lowest360.price = price
            lowest360.Price = `¥${String(price)}`
            lowest360.Date = date
            lowest360.Difference = difference(currentPrice, price)
        }
    });
    return [lowest30, lowest90, lowest180];
}

function difference(currentPrice, price) {
    let difference = sub(currentPrice, price)
    if (difference == 0) {
        return "-"
    } else {
        return `${difference > 0 ? "↑" : "↓"}${String(difference)}`
    }
}

function sub(arg1, arg2) {
    return add(arg1, -Number(arg2), arguments[2]);
}

function add(arg1, arg2) {
    arg1 = arg1.toString(), arg2 = arg2.toString();
    var arg1Arr = arg1.split("."),
        arg2Arr = arg2.split("."),
        d1 = arg1Arr.length == 2 ? arg1Arr[1] : "",
        d2 = arg2Arr.length == 2 ? arg2Arr[1] : "";
    var maxLen = Math.max(d1.length, d2.length);
    var m = Math.pow(10, maxLen);
    var result = Number(((arg1 * m + arg2 * m) / m).toFixed(maxLen));
    var d = arguments[2];
    return typeof d === "number" ? Number((result).toFixed(d)) : result;
}

function dateFormat(cellval) {
    const date = new Date(parseInt(cellval.replace("/Date(", "").replace(")/", ""), 10));
    const month = date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
    const currentDate = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
    return date.getFullYear() + "-" + month + "-" + currentDate;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${
        date.getMonth() + 1
    }-${date.getDate()}`;
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

function Request() {
    return new(class {
        request(obj, method) {
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