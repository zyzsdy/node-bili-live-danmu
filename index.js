const axios = require('axios');
const xmlparser = require('fast-xml-parser');
const net = require('net');
const DanmuAutoParseStream = require('./DanmuAutoParseStream');

const DM_MSG_POPULARITY = 2;
const DM_MSG_PLAYER_COMMAND = 4;
const DM_MSG_JOIN_COMMAND = 7;

class DanmuProvider{
    constructor(loogRoomid, daps) {
        this.roomid = loogRoomid;
        this.chatClient = null;
        this.connected = false;
        this.daps = daps;
    }

    connect() {
        if (this.connected){
            console.error("Already connected!");
            return;
        }else{
            this.connected = true;
        }

        //调用API获取弹幕服务器的地址和端口
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

    disconnect(){
        if (!this.connected){
            console.error("Not connected!");
            return;
        }

        this.chatClient.end();
        this.connected = false;
    }
    
    _connectBili(info){
        this.chatClient = new net.Socket();
        this.chatClient.connect(parseInt(info.port), info.server, () => {
            console.log('START CONNECTING TO: ' + info.server + ":" + info.port);

            //发送加入频道请求
            let tmpUid = parseInt(1e14 + 2e14 * Math.random());
            let joinData = {
                "roomid": this.roomid,
                "uid": tmpUid
            }
            this._send(DM_MSG_JOIN_COMMAND, JSON.stringify(joinData));

            //循环发送心跳包
            this._heartBeat();
        });
        this.chatClient.pipe(this.daps);
        this.chatClient.on("end", () => {
            console.info("The server actively closes the connection.");
        });
        this.chatClient.on("close", had_error => {
            if(had_error){
                console.error("The connection is closed due to a transmission error.");
            }else{
                console.info("Disconnected.");
            }
            this.connected = false;
        });
        this.chatClient.on("error", err => {
            console.error("An error occurred in the connection: " + err);
            this.connected = false;
            this.chatClient.destroy();
        });
    }

    _heartBeat(){
        if(this.connected){
            this._send(DM_MSG_POPULARITY);
            setTimeout(() => {
                this._heartBeat();
            }, 30000);
        }
    }

    _send(action, body = ""){
        let magic = 16;
        let protoVersion = 1;
        let param = 1;

        //console.log(body);

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


module.exports = {
    DanmuProvider: DanmuProvider,
    DanmuAutoParseStream: DanmuAutoParseStream
}