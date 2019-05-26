const BiliLiveDanmu = require('./index');

function test(){
    let danmuProvider = new BiliLiveDanmu(14917277);
    danmuProvider.connect();
    danmuProvider.on('qirenzhi', c => {
        console.log("气人值: " + c);
    });
    danmuProvider.on('danmu', c => {
        console.log(c);
    })
}

test();