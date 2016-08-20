var crypto = require('crypto');
var uuid = require('node-uuid');
//函數
cm = exports;
//返回錯誤資料的結構JSON字串
//state:ERROR
//data-type:錯誤類型:預設DEFAULT
//	  -message:	錯誤詳細訊息
//    -detail:錯誤附帶資料物件
cm.errorGenerator = function (message,detail,type){
	var data = {};
	data.type = type || "DEFAULT";
	data.message = message || "";
	data.detail = detail || {};
	
	data.message = data.message instanceof Error ? data.message.message:data.message;
	
	return cm.dataPacketGenetor("ERROR",data);
}

//通訊json產生
//state:ERROR,OK
//data:必須為json物件或著JSON字串
cm.dataPacketGenetor = function (state,data){
	//為了能stringify Error物件，從網路上找到的解法函式
	function replaceErrors(key, value) {
    if (value instanceof Error) {
        var error = {};

        Object.getOwnPropertyNames(value).forEach(function (key) {
            error[key] = value[key];
        });

        return error;
    }

    return value;
}
	
	
	var packet = {};
	packet.state = state;
	
	if(typeof data == "steing")data = JSON.parse(data);
	packet.data = data;
	return JSON.stringify(packet,replaceErrors);
}

//取得logger
cm.getLogger = function(obj){
	//console.log('getLogger:'+typeof obj);
	var title = typeof obj == "string"?obj:obj.name;
	return function(message){
		console.log('['+title+']'+(obj instanceof Error?'[錯誤]':'')+message);
		//this.dir=console.dir;
	}
}


//密碼加密
cm.encryptPassword = function(passwords,userid){
	var md5 = crypto.createHash('md5');
	return md5.update(passwords+cm.getUserSalt(userid)).digest('hex');
} 

//密碼比較
cm.comparePassword= function(passwords,encryptedpasswords,userid){
	return cm.encryptPassword(passwords,userid)===encryptedpasswords;
} 

//取得使用者的鹽
cm.getUserSalt= function(userid){
	//cm.getLogger('cm.getUserSalt')('取得使用者['+userid+']的鹽');
	var md5 = crypto.createHash('md5');
	return md5.update(userid).digest('hex');
} 

//產生Token
cm.getToken= function(){
	return uuid.v1();
}


//從ObjectID取得時間
cm.getDateFromObjectID= function(objectId){
	return  new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
}

cm.objClone=function(obj){
	return JSON.parse(JSON.stringify(obj));
}