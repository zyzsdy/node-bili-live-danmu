# bilibili直播弹幕解析库

## 安装

```
npm i danmulive --save
```

## 简易用法

```javascript
const { DanmuProvider, DanmuAutoParseStream } = require('danmulive');

let danmuParser = new DanmuAutoParseStream();
let danmuProvider = new DanmuProvider(12235923, danmuParser);

danmuProvider.connect();

danmuParser.on("data", data => {
    //console.log(data);

    if (data.type == "danmu"){
        if (data.value.cmd.startsWith("DANMU_MSG")){
            let author = data.value.info[2][1];
            let content = data.value.info[1];
            console.log(author + ":\t\t" + content);
        }
    }

    if (data.type == "qirenzhi"){
        console.log("气人值：" + data.value);
    }

    if (data.type == "connected"){
        console.log("连接成功");
    }
});
```

## 简易文档

### 类 BiliLiveDanmu

#### 构造函数 BiliLiveDanmu(longRoomid: number, daps: DanmuAutoParseStream)

longRoomid: Int32整数，直播间号（短号不可）

daps: 类DanmuAutoParseStream的实例

#### 方法：

**connect()**

无参数

连接

**disconnect()**

无参数

关闭连接

### 类 DanmuAutoParseStream

#### 构造函数

无参数

### 事件

**data**

获得弹幕数据

参数：DanmuModel的实例

### 接口 DanmuModel （未实现，不影响使用）

type  类型

value 值

type目前有三种类型

danmu、qirenzhi、connected

danmu的value是bilibili直播播放器解析的json

qirenzhi的value是一个int32，值为服务器更新的当前人气

connected的value恒为true，表明服务器已经接受了连接请求