var co = require('co');
var prompt = require('prompt-promise');
var http = require('http');
var common = require ('./comminFunctions');

var logger = common.getLogger('Client');
var config = require('./config');


//post函數
function post(data,host,pathurl,port){
	var logger = common.getLogger('post函式');
	var options = {
      'host': host,
      'port': port,
      'path': pathurl,
      'method': 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
      }
	};
	// 設置callback
	var promise = new Promise(function(resolve,reject){
		var post_req = http.request(options, function(res) {
		  res.setEncoding('utf8');
		  res.on('data', function (data) {
			  logger('收到回應: ' + data);
			  resolve(data);
		  });
		});

		// 送出資料
		post_req.write(data);
		post_req.end();
		
	});
	
	return promise;

  
}

//二次包裝
function simple_post(data,service){
	return post(common.dataPacketGenetor("OK",data),config.client.serverIP,service,config.client.port);
}

//運行時的使用者資料
var User = {
	userid:"",
	passwords:"",
	token:""
};

//選項物件
function Option(_title,gen){
	this.title = _title;
	this.gen = gen;
}

var option_printMenu = new Option("顯示主選單",function * (){
	console.log("========選單========");
	for(var key in Options){
		console.log(key+"."+Options[key].title);
	}
	console.log("====[e to EXIT]=====");
});



var option_login = new Option("登入",function * (){
	User.userid = yield prompt("請輸入userid:");
	User.passwords = yield prompt("請輸入passwords:");
	var result = yield simple_post({userid:User.userid,passwords:User.passwords},'/login');

	result = JSON.parse(result);
	User.token = result.data.token;
	logger(`
	登入 返回結果:
		state:${result.state}
		message:${result.data.message}
		用戶token:${result.data.token}
	`.trim());
});

var option_logout = new Option("登出",function * (){
	var result = yield simple_post({token:User.token},'/logout');
	User.token = "";

	result = JSON.parse(result);
	logger(`
	登出 返回結果:
		state:${result.state}
		message:${result.data.message}
	`.trim());
});

var option_createUser = new Option("創造新用戶",function * (){
	new_user={};
	new_user.userid = yield prompt("請輸入 新用戶 userid:");
	new_user.passwords = yield prompt("請輸入 新用戶 passwords:");
	new_user.name = yield prompt("請輸入 新用戶 name:");
	new_user.age = yield prompt("請輸入 新用戶 age:");
	var result = yield simple_post({token:User.token,userid:new_user.userid,passwords:new_user.passwords,name:new_user.name,age:new_user.age},'/createUser');
	logger('創造新用戶 返回結果: ' + result);

	result = JSON.parse(result);
	logger(`
	創造新用戶 返回結果:
		state:${result.state}
		message:${result.data.message}
		用戶id:${result.state=="OK"?result.data.data.userid:undefined}
		用戶name:${result.state=="OK"?result.data.data.name:undefined}
		用戶age:${result.state=="OK"?result.data.data.age:undefined}
	`.trim());
});

var option_deleteUser = new Option("刪除用戶",function * (){
	delete_userid = yield prompt("請輸入要刪除的用戶:");
	var result = yield simple_post({token:User.token,userid:delete_userid},'/deleteUser');

	result = JSON.parse(result);
	logger(`
	刪除用戶 返回結果:
		state:${result.state}
		message:${result.data.message}
		被刪除的 用戶id:${result.state=="OK"?result.data.data.userid:undefined}
	`.trim());
});

var option_updatePasswords = new Option("更新密碼",function * (){
	var old_password = yield prompt("請輸入舊密碼:");
	var new_password = yield prompt("請輸入新密碼:");
	var result = yield simple_post({token:User.token,userid:User.userid,old_password:old_password,new_password:new_password},'/updatePasswords');


	result = JSON.parse(result);
	logger(`
	更新密碼 返回結果:
		state:${result.state}
		message:${result.data.message}
		被更新的 用戶id:${result.state=="OK"?result.data.data.userid:undefined}
	`.trim());
});

var option_updateProfile = new Option("更新用戶資料",function * (){
	data  = {};
	data.name = yield prompt("請輸入 新名字:");
	data.age = yield prompt("請輸入 新年齡:");
	var result = yield simple_post({token:User.token,userid:User.userid,data:{name:data.name,age:data.age}},'/updateProfile');

	result = JSON.parse(result);
	logger(`
	更新用戶資料 返回結果:
		state:${result.state}
		message:${result.data.message}
		被更新的 用戶id:${result.state=="OK"?result.data.data.userid:undefined}
	`.trim());

});

var option_getUserProfile = new Option("取得用戶資料",function * (){
	var result = yield simple_post({token:User.token,userid:User.userid},'/getUserProfile');

	result = JSON.parse(result);
	logger(`
	取得用戶資料 返回結果:
		state:${result.state}
		message:${result.data.message}
		用戶id:${result.state=="OK"?result.data.data.userid:undefined}
		用戶name:${result.state=="OK"?result.data.data.name:undefined}
		用戶age:${result.state=="OK"?result.data.data.age:undefined}
	`.trim());
});

var Options = [
	option_printMenu,
	option_login,
	option_logout,
	option_createUser,
	option_deleteUser,
	option_updatePasswords,
	option_updateProfile,
	option_getUserProfile
];


/*
var option_sample = new Option("",function * (){

});
*/



co(function * (){
	try {
		yield* Options[0].gen();
		while (true) {
			var select = yield prompt("請輸入選項:");
			if(select == 'e') break;
			if(isNaN(parseInt(select))){
				console.log("請輸入有效的選項!");
				continue;
			}
			yield* Options[parseInt(select)].gen();
		}
	}catch(ex){
		console.log(ex)
	}


});













