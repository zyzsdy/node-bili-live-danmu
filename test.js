const { DanmuProvider, DanmuAutoParseStream } = require('.');


function test(){
    let danmuParser = new DanmuAutoParseStream();
    let danmuProvider = new DanmuProvider(12235923, danmuParser);
    //let danmuProvider = new DanmuProvider(14917277, danmuParser);
    
    danmuProvider.connect();
    
    danmuParser.on("data", data => {
        //console.log(data);

        if (data.type == "danmu"){
            if (data.value.cmd == "DANMU_MSG"){
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

    setTimeout(() => {
        danmuProvider.disconnect();
    }, 300000);
}

test();