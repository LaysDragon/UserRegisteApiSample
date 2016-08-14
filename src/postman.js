var http = require('http');
var common = require ('./comminFunctions');
//var readline = require('readline')


var logger = common.getLogger('Client');

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

function simple_post(data,service){
	return post(common.dataPacketGenetor("OK",data),'127.0.0.1',service,3000);
}

//測試開始

//login

var loginData={};
loginData.userid="test";
loginData.passwords="test";

var token;
//看要測試什麼就把不要測試的註解掉


//登入
simple_post(loginData,'/login')
.then(function(result){
	logger('返回結果: ' + result)
	token = JSON.parse(result).data.token;

	//登出
	//return simple_post({token:token},'/logout');
})
.then(function(result){
	logger('返回結果: ' + result)
	
	//創造使用者
	return simple_post({token:token,userid:'laysDragon-2',passwords:'233',name:'2233ssdsis a person',age:20},'/createUser');
})
.then(function(result){
	logger('返回結果: ' + result)
	
	//刪除使用者
	return simple_post({token:token,userid:'233ee'},'/deleteUser');
})
.then(function(result){
	logger('返回結果: ' + result)
})
//錯誤總捕捉
.catch(function(error){
	logger('錯誤:'+error);
});


/* var stdin = process.openStdin();

var menu = {
	print:function menu(){
		console.log('選項:');
		console.log('1.login');
		console.log('2.logout');
		console.log('3.createUser');
		console.log('4.deleteUser');
	},
	options:[
		function(input){
			simple_post(loginData,'/login')
			.then(function(result){
				logger('返回結果: ' + result)
				token = JSON.parse(result).data.token;

				//登出
				//return simple_post({token:token},'/logout');
			})
		},
		function(input){
			
		},
		function(input){
			
		},
		function(input){
			
		},
	]
}

stdin.addListener("data", function(input) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that  
    // with toString() and then trim() 
    console.log("you entered: [" + 
        d.toString().trim() + "]");
		
		input
 }); */












