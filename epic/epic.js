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
  items.forEach((item) => {
    console.log(`🎮 [Epic 限免]  ${item.title}`);
    console.log(
      `⏰ 发布时间: ${item.promotions.promotionalOffers[0].promotionalOffers[0].startDate}`
    );
    console.log(`📰 游戏简介: ${item.description}`);
    let url = "https://store.epicgames.com/zh-CN/p/";
    item.categories.forEach((category) => {
      if (category.path == "bundles") {
        url = "https://store.epicgames.com/zh-CN/bundles/";
      }
    });
    url +=
      item.catalogNs.mappings.length > 0
        ? item.catalogNs.mappings[0].pageSlug
        : item.offerMappings.length > 0
        ? item.offerMappings[0].pageSlug
        : item.productSlug
        ? item.productSlug
        : item.urlSlug;
    console.log(`url: ${url}`);
    $notification.post(
      `🎮 [Epic 限免]  ${item.title}`,
      `⏰ 发布时间: ${item.promotions.promotionalOffers[0].promotionalOffers[0].startDate}`,
      `📰 游戏简介: ${item.description}`,
      {
        url,
      }
    );
  });
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
