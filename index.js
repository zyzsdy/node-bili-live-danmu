const axios = require('axios');
const xmlparser = require('fast-xml-parser');
const net = require('net');
const events = require('events')

class BiliLiveDanmu extends events.EventEmitter {
    constructor(loogRoomid) {
        super();
        this.roomid = loogRoomid;
        this.chatClient = null;
    }

    connect() {
        if (this.chatClient != null){
            console.error("Already Connected!");
            return;
        }


        new Promise((resolve, reject) => {
            axios.get("http://live.bilibili.com/api/player?id=cid:" + this.roomid)
            .then(res => {
                let xmlString = "<root>" + res.data + "</root>";
                let chatInfo = xmlparser.parse(xmlString);

                resolve({
                    "server": chatInfo.root.dm_server,
                    "port": chatInfo.root.dm_port
                });
            })
            .catch(err => {
                console.error(err);
            });
        }).then(info => {
            this._connectBili(info);
        });
        
    }
    
    _connectBili(info){
        this.chatClient = new net.Socket();
        this.chatClient.connect(parseInt(info.port), info.server, () => {
            console.log('START CONNECT TO:' + info.server + ":" + info.port);

            //发送加入频道请求
            let tmpUid = parseInt(1e14 + 2e14 * Math.random());
            let joinData = {
                "roomid": this.roomid,
                "uid": tmpUid
            }
            this._send(7, JSON.stringify(joinData));

            //循环发送心跳包
            setInterval(() => {
                this._send(2);
            }, 30000);
            this._send(2);
        });
        this.chatClient.on("data", data => {
            let danmuBuffer = Buffer.from(data, 'utf-8');
            
            let packetLength = danmuBuffer.readInt32BE(0);
            let magic = danmuBuffer.readInt16BE(4);
            let protoVersion = danmuBuffer.readInt16BE(6);
            let typeId = danmuBuffer.readInt32BE(8);
            let typeParam = danmuBuffer.readInt32BE(12);

            //console.log("DEBUG:" + packetLength + "," + magic + "," + protoVersion + "," + typeId + "," + typeParam);

            if (magic == 16 && packetLength - 16 > 0){
                let body = danmuBuffer.slice(16);

                typeId -= 1;

                if(typeId == 2){
                    let qiRenZhi = body.readInt32BE(0);
                    //console.log("气人值:" + qiRenZhi);
                    this.emit('qirenzhi', qiRenZhi);
                }

                if(typeId == 4){
                    //console.log(body.toString());
                    this.emit('danmu', body.toString());
                }
            }
        });
    }

    _send(action, body = ""){
        let magic = 16;
        let protoVersion = 1;
        let param = 1;

        console.log(body);

        let payload = Buffer.from(body, 'utf-8');
        let packetLength = payload.length + 16;

        let sendBuffer = Buffer.alloc(packetLength);
        sendBuffer.writeInt32BE(packetLength, 0);
        sendBuffer.writeInt16BE(magic, 4);
        sendBuffer.writeInt16BE(protoVersion, 6);
        sendBuffer.writeInt32BE(action, 8);
        sendBuffer.writeInt32BE(param, 12);

        if (payload.length > 0) {
            payload.copy(sendBuffer, 16);
        }

        this.chatClient.write(sendBuffer);
    }
}


module.exports = BiliLiveDanmu;