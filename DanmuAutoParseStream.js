const { Transform } = require('stream');
const { inflate } = require('zlib');

const DM_MSG_POPULARITY = 3;
const DM_MSG_PLAYER_COMMAND = 5;
const DM_MSG_JOIN_COMMAND = 8;

class DanmuAutoParseStream extends Transform{
    constructor(){
        super({
            readableObjectMode: true
        });
        this.cacheBuffer = Buffer.alloc(0);
    }

    _transform(chunk, encoding, callback){
        //当前chunk放入缓存
        //console.log("DEBUG: TEST, " + this.cacheBuffer.length + ", " + chunk.length);
        this.cacheBuffer = Buffer.concat([this.cacheBuffer, chunk]);

        while(true){
            if (this.cacheBuffer.length == 0){
                callback();
                break; //缓存空了
            }

            //判断缓存是否还有没解析的数据包
            if (this.cacheBuffer.length < 4){
                //缓存数据小于4字节，无法读出整个包长度，此时应该等待后续数据包
                console.warn("DEBUG: The length of the data in the cache is less than one header.");
                callback();
                break;
            }

            try{
                //能进入此块，缓存数据必然有至少4字节，可以读出包长度
                let packetLength = this.cacheBuffer.readInt32BE(0);

                if (this.cacheBuffer.length < packetLength){
                    callback(); //缓存剩下的内容不足一个完整的数据包
                    break;
                } else {
                    let danmuBuffer = this.cacheBuffer.slice(0, packetLength); //切出当前整个数据包
                    this.cacheBuffer = this.cacheBuffer.slice(packetLength); //剩余数据包留在缓存中

                    //解析数据包
                    let danmuPacket = new DanmuPacket(danmuBuffer);

                    //console.log(`DEBUG: ////${danmuPacket.dmPacketLength},${danmuPacket.dmHeaderLength},VER ${danmuPacket.protoVersion},cmd ${danmuPacket.action},${danmuPacket.param}`);

                    let typeId = danmuPacket.action;
                    let body = danmuPacket.body;

                    if(typeId == DM_MSG_PLAYER_COMMAND){
                        if(danmuPacket.protoVersion == 1){
                            let danmuObject = JSON.parse(body.toString());
                            this.push({
                                "type": "danmu",
                                "value": danmuObject
                            });
                        }
                        else if(danmuPacket.protoVersion == 2){
                            //压缩弹幕

                            inflate(body, (err, data) => {
                                while(true){
                                    if(data.length < 4) break; //小于4字节，已无法读取，忽略

                                    let deflateLength = data.readInt32BE(0); //数据包长度
                                    if(data.length < deflateLength) break; //小于一个数据包，忽略

                                    let deflateDanmuBuffer = data.slice(0, deflateLength); //切出当前弹幕数据包
                                    data = data.slice(deflateLength); //剩余数据

                                    let defalteDanmuPacket = new DanmuPacket(deflateDanmuBuffer);
                                    if(defalteDanmuPacket.action == DM_MSG_PLAYER_COMMAND){
                                        //console.log(`INNER proto` + defalteDanmuPacket.dmPacketLength + "," + defalteDanmuPacket.protoVersion + "," + defalteDanmuPacket.action + "," + defalteDanmuPacket.param);
                                        let defalteDanmuObject = JSON.parse(defalteDanmuPacket.body);
                                        this.push({
                                            "type": "danmu",
                                            "value": defalteDanmuObject
                                        });
                                    }
                                    else{
                                        console.log("Other types of compression comment: " + defalteDanmuPacket.dmPacketLength + "," + defalteDanmuPacket.protoVersion + "," + defalteDanmuPacket.action + "," + defalteDanmuPacket.param);
                                    }
                                }


                            });
                        }
                        else{
                            //console.log("Received the wrong packet: DEBUG:" + danmuPacket.dmPacketLength + "," + danmuPacket.protoVersion + "," + danmuPacket.action + "," + danmuPacket.param);
                            let danmuObject = JSON.parse(body.toString());
                            //console.log(danmuObject);
                            this.push({
                                "type": "danmu",
                                "value": danmuObject
                            });
                        }
                    }
                    else if(typeId == DM_MSG_POPULARITY){
                        let qiRenZhi = danmuPacket.body.readInt32BE(0);
                        this.push({
                            "type": "qirenzhi",
                            "value": qiRenZhi
                        });
                    }
                    else if(typeId == DM_MSG_JOIN_COMMAND){
                        this.push({
                            "type": "connected",
                            "value": true
                        });
                    }
                    else{
                        console.log("Received the unknown packet: DEBUG:" + danmuPacket.dmPacketLength + "," + danmuPacket.protoVersion + "," + danmuPacket.action + "," + danmuPacket.param);
                    }
                }
            } catch(err){
                console.error("DEBUG: An error occurred and all caches were discarded. " + err);
                this.cacheBuffer = Buffer.alloc(0);
                callback();
                break;
            }
        }
    }
}

class DanmuPacket{
    constructor(danmuBuffer){
        //解析数据包头部
        this.dmPacketLength = danmuBuffer.readInt32BE(0); //0~3字节 包长度
        this.dmHeaderLength = danmuBuffer.readInt16BE(4); //4~5字节 头部长度
        this.protoVersion = danmuBuffer.readInt16BE(6); //6~7字节 协议版本号 当前为 2
        this.action = danmuBuffer.readInt32BE(8); //8~11字节 操作命令
        this.param = danmuBuffer.readInt32BE(12); //12~15字节 操作命令参数（sub命令）

        if(this.dmPacketLength > this.dmHeaderLength){
            this.body = danmuBuffer.slice(this.dmHeaderLength);
        }else{
            this.body = Buffer.alloc(0);
        }
    }
}

module.exports = DanmuAutoParseStream;