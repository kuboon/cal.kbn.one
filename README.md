[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kuboon/cal.kbn.one) 

# 第2、第4木曜日 みたいなやつをさっと取れる API

第N曜日API https://cal.kbn.one

## 使い方
2020年の第2、第4木曜日を知りたいときは、
- https://cal.kbn.one/api/week/2020/2,4/th にアクセス。
- https://cal.kbn.one/api/week/2020/2,4/th.csv や
- https://cal.kbn.one/api/week/2020/2,4/th.json もある。

中身は 2020 年前後1年の合計3年分の該当日付の一覧。
これを元に、 Javascript で「次の該当日」を取得するには、例えば以下のようにする。

```javascript
function fetchData(year){
  return new Promise((resolve, reject)=>{
    fetch(`https://cal.kbn.one/api/week/${year}/2,4/th.json`)
    .then(res=>res.json())
    .then(resolve)
    .catch(reject)
  })
}
function next(json){
  const now = Date.now()
  return json.find(j => now < new Date(j.date).setHours(19, 30))
}

fetchData(new Date().getFullYear())
.then(json=>{
  const j = next(json)
  const text = `次回は${j.m}月第${j.num}木曜日、${j.d}日でーす`
  document.getElementById("next").innerText = text;
})
```

上記関数を組み込み済みの https://cal.kbn.one/api/week/2020/2,4/th.js も用意したので、ブラウザの ```import()``` を使って以下のようにするのが一番簡単です。

```javascript
import(`https://cal.kbn.one/api/week/${new Date().getFullYear()}/2,4/th.js`)
.then(m => {
  const j = m.next(19, 30)
  const text = `次回は${j.m}月第${j.num}木曜日、${j.d}日でーす`
  document.getElementById("next").innerText = text;
})
```

## 特徴
- json の他、 csv, html テーブル出力に対応
- html テーブルは Excel や google sheets に貼り付けて使うのに便利
- Permanent URL, CDN Friendly
- zeit now にデプロイ。 Ruby Rack runtime を使用。

## CDN Friendly API
今回のこだわりはここです。
最初は、「次回の日付を取得する」APIを作ろうと思いました。
しかし「次回の当日」のいつ、その次の日付に表示が切り替わるべきか？と考えると悩みました。例えば毎月第二月曜日の夜19時からの会合があったとします。当日の朝にはその日の日付が表示されていてほしいですが、会合が終わったころには次の日付が表示されてほしいですよね？あるいは、当日に限り、今回と次回の両方を表示したい、という需要もあるかもしれない。
悩んだ結果、そういうのを全部サーバーサイドで対応するのはやめました。「毎月第二月曜日」のリストを作るのが少々面倒だけど、それさえ用意できれば、上述の next 関数のようなものは簡単に作れるからです。
また、プログラミングは出来ないけど Excel で事務作業をされている方にも使ってもらえるようにしようと思いました。 JSON を html テーブルに加工するのは簡単ですのでオマケです。

1年分だと、年末に支障が出るし、期末に1年分のまとめ資料を作る、のような用途もありうると思い、「年を指定したら前後1年の計3年分」にしました。ここはえいやで決めました。どうしても3年以上欲しい人は複数回リクエストを送って手元で繋げればよいでしょう。

こうして仕様をそぎ取っていき、「誰がいつアクセスしても、同じ値が取得できる」ように URL 設計をして API 化しました。こうすると、 CDN でキャッシュ可能になり、サーバー負荷がとても楽になるし反応速度も出ます。かなりビュー数の多い人気サイトで使っていただいてもへっちゃらですので遠慮なくご利用ください。
