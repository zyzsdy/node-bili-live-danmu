const { DanmuProvider, DanmuAutoParseStream } = require('.');


function test(){
    let danmuParser = new DanmuAutoParseStream();
    //let danmuProvider = new DanmuProvider(12235923, danmuParser);
    //let danmuProvider = new DanmuProvider(14917277, danmuParser);
    let roomid = parseInt(process.argv[2] || 14917277);
    
    let danmuProvider = new DanmuProvider(roomid, danmuParser);
    
    danmuProvider.connect();
    
    danmuParser.on("data", data => {
        //console.log(data);

        if (data.type == "danmu"){
            if (data.value.cmd.startsWith("DANMU_MSG")){
                //console.log(data.value.cmd);

                let flag = data.value.info[0][9];
                let author = data.value.info[2][1];
                let content = data.value.info[1];

                if (author.length <= 25){
                    author = author + ":" + " ".repeat(25 - author.length);
                }

                if (flag == 0) console.log(author + "\t" + content);
                //else console.log("==");
            }
            else{
                console.log(data.value.cmd);
            }
        }

        if (data.type == "qirenzhi"){
            if (data.value > 1)
            console.log("气人值：" + data.value);
        }

        if (data.type == "connected"){
            console.log(roomid + " 连接成功");
        }
    });

    //setTimeout(() => {
    //    danmuProvider.disconnect();
    //}, 300000);
}

test();