fetchFreeGames().then(() => {
  $done();
});

async function fetchFreeGames() {
  const request = Request();
  const { body } = await request.get({
    url: "https://rsshub.app/epicgames/freegames",
  });
  const itemRegex = new RegExp(/<item>[\s\S]*?<\/item>/g);
  body.match(itemRegex).forEach((item) => {
    let name = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)[1];
    let url = item.match(/<link>([\s\S]*?)<\/link>/)[1];
    let time = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)[1];
    let description = item.match(
      /<description><!\[CDATA\[<p>([\s\S]+?)<\/p>/
    )[1];
    console.log(`🎮 [Epic 限免]  ${name}`);
    console.log(`⏰ 发布时间: ${formatTime(time)}`);
    console.log(`📰 游戏简介: ${description}`);
    $notification.post(
      `🎮 [Epic 限免]  ${name}`,
      `⏰ 发布时间: ${formatTime(time)}`,
      `📰 游戏简介: ${description}`,
      {
        url,
      }
    );
  });
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

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}年${
    date.getMonth() + 1
  }月${date.getDate()}日${date.getHours()}时`;
}
