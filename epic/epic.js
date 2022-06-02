fetchFreeGames().then(() => {
  $done();
});

async function fetchFreeGames() {
  const request = Request();
  const { body } = await request.get({
    url: "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=zh-CN&country=US&allowCountries=US",
  });
  const data = JSON.parse(body);
  const now = new Date();
  const items = data.data.Catalog.searchStore.elements.filter(
    (item) =>
      item.promotions &&
      item.promotions.promotionalOffers &&
      item.promotions.promotionalOffers[0] &&
      new Date(
        item.promotions.promotionalOffers[0].promotionalOffers[0].startDate
      ) <= now &&
      new Date(
        item.promotions.promotionalOffers[0].promotionalOffers[0].endDate
      ) > now
  );
  for await (let item of items) {
    let url = "https://store.epicgames.com/zh-CN/p/";
    let isBundles = false;
    let contentUrl =
      "https://store-content-ipv4.ak.epicgames.com/api/zh-CN/content/products/";
    item.categories.some((category) => {
      if (category.path == "bundles") {
        url = "https://store.epicgames.com/zh-CN/bundles/";
        isBundles = true;
        contentUrl =
          "https://store-content-ipv4.ak.epicgames.com/api/zh-CN/content/bundles/";
        return true;
      }
    });
    const urlSlug =
      item.catalogNs.mappings.length > 0
        ? item.catalogNs.mappings[0].pageSlug
        : item.offerMappings.length > 0
        ? item.offerMappings[0].pageSlug
        : item.productSlug
        ? item.productSlug
        : item.urlSlug;
    url += urlSlug;
    contentUrl += urlSlug;
    let description = item.description;
    if (item.offerType !== "BASE_GAME") {
      let contentResp = await request.get({
        url: contentUrl,
      });
      contentResp = JSON.parse(contentResp.body);
      description = isBundles
        ? contentResp.data.about.shortDescription
        : contentResp.pages[0].data.about.shortDescription;
    }
    const startDate = formatTime(
      item.promotions.promotionalOffers[0].promotionalOffers[0].startDate
    );
    const endDate = formatTime(
      item.promotions.promotionalOffers[0].promotionalOffers[0].endDate
    );
    console.log(`🎮 [Epic 限免]  ${item.title}`);
    console.log(`📅️ 日期: ${startDate} - ${endDate}`);
    console.log(`url: ${url}`);
    console.log(`📰 游戏简介: ${description}`);
    $notification.post(
      `🎮 [Epic 限免]  ${item.title}`,
      `📅️ 日期: ${startDate} - ${endDate}`,
      `📰 游戏简介: ${description}`,
      {
        url,
      }
    );
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
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  month = month > 10 ? month : `0${month}`;
  let day = date.getDate();
  day = day > 10 ? day : `0${day}`;
  let hours = date.getHours();
  hours = hours > 10 ? hours : `0${hours}`;
  let minutes = date.getMinutes();
  minutes = minutes > 10 ? minutes : `0${minutes}`;
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
