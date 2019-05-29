const { Transform } = require('stream');

const DM_MSG_POPULARITY = 2;
const DM_MSG_PLAYER_COMMAND = 4;
const DM_MSG_JOIN_COMMAND = 7;

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
            if (this.cacheBuffer.length < 16){
                //缓存数据小于一个包头，此时应该等待后续数据包
                console.warn("DEBUG: The length of the data in the cache is less than one header.");
                callback();
                break;
            }

            try{
                //能进入此块，缓存数据必然有至少一个包头（16字节）
                let packetLength = this.cacheBuffer.readInt32BE(0);
                let testMagic = this.cacheBuffer.readInt16BE(4);

                if(testMagic != 16){
                    //包损坏，丢弃全部缓存
                    console.warn("DEBUG: The package is corrupted and all caches are discarded.")
                    this.cacheBuffer = Buffer.alloc(0);
                    callback();
                    break;
                }

                if (this.cacheBuffer.length < packetLength){
                    callback(); //缓存剩下的内容不足一个完整的数据包
                    break;
                } else {
                    let danmuBuffer = this.cacheBuffer.slice(0, packetLength);
                    this.cacheBuffer = this.cacheBuffer.slice(packetLength);

                    //解析数据包
                    let dmPacketLength = danmuBuffer.readInt32BE(0);
                    let magic = danmuBuffer.readInt16BE(4);
                    let protoVersion = danmuBuffer.readInt16BE(6);
                    let typeId = danmuBuffer.readInt32BE(8);
                    let typeParam = danmuBuffer.readInt32BE(12);

                    //console.log("DEBUG:" + packetLength + "," + magic + "," + protoVersion + "," + typeId + "," + typeParam);

                    if (magic == 16 && dmPacketLength - 16 > 0){
                        let body = danmuBuffer.slice(16);

                        typeId -= 1;

                        if(typeId == DM_MSG_POPULARITY){
                            let qiRenZhi = body.readInt32BE(0);
                            //console.log("气人值:" + qiRenZhi);
                            this.push({
                                "type": "qirenzhi",
                                "value": qiRenZhi
                            });
                        }

                        if(typeId == DM_MSG_PLAYER_COMMAND){
                            //console.log(body.toString());
                            let danmuObject = JSON.parse(body.toString());
                            this.push({
                                "type": "danmu",
                                "value": danmuObject
                            });
                        }
                    }else if (magic == 16 && dmPacketLength - 16 == 0){
                        typeId -= 1;

                        if(typeId == DM_MSG_JOIN_COMMAND){
                            this.push({
                                "type": "connected",
                                "value": true
                            });
                        }
                    }else{
                        console.log("Received the wrong packet: DEBUG:" + dmPacketLength + "," + magic + "," + protoVersion + "," + typeId + "," + typeParam);
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

module.exports = DanmuAutoParseStream;