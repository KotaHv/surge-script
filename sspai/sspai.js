const title = "少数派";
const items = [55, 15];
const request = Request();

main().then(() => $done());

async function main() {
  for await (const item of items) {
    await fetch_item_info(item);
  }
}

async function fetch_item_info(item_id) {
  const url = `https://sspai.com/api/v1/item/info/get?id=${item_id}`;
  const { body } = await request.get({
    url,
  });
  const data = JSON.parse(body);
  const details = data.data.details;
  const name = data.data.name;
  for (const item of details) {
    const price = item.price / 100;
    const costPriceOutside = item.cost_price_outside / 100;
    if (price != costPriceOutside) {
      const specification = item.specification;
      $notification.post(
        `🏬️ [${title}]${name}`,
        `📰 ${specification}`,
        `💰️ 原价: ${costPriceOutside}\n💰️ 现价: ${price}`,
        {
          url: `https://sspai.com/item/${item_id}`,
        }
      );
    }
  }
}

function Request() {
  return new (class {
    request(obj, method) {
      obj.headers = {};
      obj.headers["User-Agent"] =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36";
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
