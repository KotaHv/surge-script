# Quantumult X

## AcFun

```
[rewrite_remote]
https://raw.githubusercontent.com/KotaHv/surge-script/main/QuantumultX/AcFun.snippet, tag=AcFun Cookie, update-interval=172800, opt-parser=false, enabled=true
[task_local]
0 9 * * * https://raw.githubusercontent.com/KotaHv/surge-script/main/Scripts/AcFun.js, tag=AcFun签到
```

## 哔哩哔哩漫画

```
[rewrite_remote]
https://raw.githubusercontent.com/KotaHv/surge-script/main/QuantumultX/BilibiliComics.snippet, tag=哔哩哔哩漫画Cookie, update-interval=172800, opt-parser=false, enabled=true
[task_local]
0 9 * * * bilibili-comic.js, tag=哔哩哔哩漫画签到
```

## Epic

```
[task_local]
0 9 * * * https://raw.githubusercontent.com/KotaHv/surge-script/main/Scripts/Epic.js, tag=Epic
```

## 京东签到

```
[rewrite_remote]
https://raw.githubusercontent.com/KotaHv/surge-script/main/QuantumultX/jd.snippet, tag=京东Cookie, update-interval=172800, opt-parser=false, enabled=true
[task_local]
15 9 * * * https://raw.githubusercontent.com/KotaHv/surge-script/main/Scripts/jd.js, tag=京东签到
```

## 京东比价

```
[rewrite_remote]
https://raw.githubusercontent.com/KotaHv/surge-script/main/QuantumultX/jdHistoryPrice.snippet, tag=京东比价, update-interval=172800, opt-parser=false, enabled=true
```

## sspai

```
[task_local]
0 10 * * * https://raw.githubusercontent.com/KotaHv/surge-script/main/Scripts/sspai.js, tag=sspai
```

