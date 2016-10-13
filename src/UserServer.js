//===初始化===
var bodyParser = require ('body-parser')
var common = require ('./comminFunctions');
var UM = require ('./UserManager');
var config = require('./config');

UserManager = UM.UserManager();

//==初始化 UserDB(mysql)
UserManager.connectUserDB(config.mysql_connect_config)
	.then( () => {
		logger("成功連接至MYSQL!!");
	})
	.catch(error => {
		logger('MYSQL連接失敗!!');
		logger(error);
	});
//==初始化 TokenDB(mongodb)
UserManager.connectTokenDB(config.mongodb_connect_config.host,config.mongodb_connect_config.port,config.mongodb_connect_config.database)
.then( db => {
	logger("成功連接至MongoDB!!");
});

//==初始化 express
var express = require('express');


//====主程式開始====
//服務器配置
//Token有效時長(秒)
UserManager.setTokenExpiration(config.server.TokenExpiration);

var app_server = express();
app_server.use(bodyParser.json());

app_server.get('/', function(req, res) {

	res.send('hello world');
});
var logger = common.getLogger("Server");

//路由配置
//[資料格式]
//state:狀態
//-OK
//-ERROR
//data:資料(如果是錯誤則返回錯誤內容)

//登入
//格式:userid,passwords
//返回:token
app_server.post('/login',function(req, res){
	var logger = common.getLogger('/login');

	logger('收到資料:'+JSON.stringify(req.body));
	var userid = req.body.data.userid
	var userpasswords = req.body.data.passwords
	//檢查帳密是否為空
	if(userid==""||userpasswords==""){
		res.send(common.errorGenerator("帳號或密碼不能為空!!"));
		return;
	}

	//進行帳號查詢

	UserManager.getUserInfo(userid)
	.then(result => {
		//(不需要了)檢查結果是否為空
		//if(result.rows.length != 0){
			logger('密碼:'+result.passwords)
			//匹配密碼是否正確
			if(common.comparePassword(userpasswords,result.passwords,result.userid)){
				//登入成功
				//檢查是否已經有錄入Token
				UserManager.getUserToken(userid)
				.then(value => {
					//檢查token是否過期
					UserManager.checkToken(value)
					.then(result =>{
						//token有效
						logger("使用者["+userid+"]已經有token了:"+value);
						res.send(common.dataPacketGenetor("OK",{message:'登入成功',token:value}));
					}).catch(error =>{
						//token有效或著錯誤
						logger('token失效或著錯誤:'+error);
						//Token無效，重新產生一個
						UserManager.createTokenForUser(userid)
						.then(value => {
							res.send(common.dataPacketGenetor("OK",{message:'登入成功',token:value}));
						}).catch(function(error){
							logger(error);
							res.send(common.errorGenerator(error,'內部錯誤'));
						});
					});

				}).catch(error =>{
					//發生錯誤
					if(error instanceof Error){
						logger(error);
						return;
					};

					//找不到Token，產生一個
					UserManager.createTokenForUser(userid)
					.then(value => {
						res.send(common.dataPacketGenetor("OK",{message:'登入成功',token:value}));
					}).catch(error => {
						logger(error);
						res.send(common.errorGenerator(error,'內部錯誤'));
					});
				});

			}else{
				logger('客戶端傳來的的密碼加密後:'+common.encryptPassword(userpasswords,userid));
				res.send(common.errorGenerator("密碼錯誤",{userid:userid}));
			}
		// }else{
		// 	logger("找不到帳號")
		// 	res.send(common.errorGenerator("無此帳號",{userid:userid}));
		// }



	}).catch(function(error){
		logger(error);
    res.send(common.errorGenerator(error));
	});


});

//登出
//格式:token
//返回:結果
app_server.post('/logout',function(req, res){
	var logger = common.getLogger('/logout');

	logger('收到資料:'+JSON.stringify(req.body));
	UserManager.checkToken(req.body.data.token)
	.then(function(result){
		UserManager.deleteToken(req.body.data.token)
		.then(function(){
			logger('登出成功');
			res.send(common.dataPacketGenetor("OK",{message:'登出成功'}));
		});
	}).catch(function(error){
		logger(error);
		if(error=='查無此Token')
			res.send(common.errorGenerator(error,{token:req.body.data.token}));
		if(error=='Token失效'){
			logger('登出成功');
			res.send(common.dataPacketGenetor("OK",{message:'登出成功'}));
		}
	}).catch(function(error){
		logger(error);
		res.send(common.errorGenerator(error,error));
	});
});

//創建使用者
//格式:token,userid,passwords,name,age
app_server.post('/createUser',function(req, res){
	var logger = common.getLogger('/createUser');

	logger('收到資料:'+JSON.stringify(req.body));
	//檢查token
	UserManager.checkToken(req.body.data.token)
	.then(function(result){
		//token有效
		UserManager.createUser(common.objClone(req.body.data) )
		.then(function(result){
			logger('創建成功!')
			console.dir(result.rows);
			data = common.objClone(req.body.data);
			delete data.passwords;
			delete data.token;
			res.send(common.dataPacketGenetor("OK",{message:'創建成功!',data:data}));

		}).catch(function(error){
			logger(error);
			res.send(common.errorGenerator(error,error));
		});
	}).catch(function(error){
			logger(error);
			res.send(common.errorGenerator(error));
	});


});

//刪除使用者
//格式:token,userid
app_server.post('/deleteUser',function(req, res){
	var logger = common.getLogger('/deleteUser');

	logger('收到資料:'+JSON.stringify(req.body));

	//檢查token
	UserManager.checkToken(req.body.data.token)
	.then(function(result){
		//token有效
		UserManager.deleteUser(common.objClone(req.body).data.userid)
		.then(function(result){
			logger('刪除成功');
			console.dir(result.rows);
			res.send(common.dataPacketGenetor("OK",{message:'使用者刪除成功!',data:{userid:req.body.data.userid}}));
		}).catch(function(error){
			logger(error);
			res.send(common.errorGenerator(error,error));
		});

	}).catch(function(error){
			logger(error);
			res.send(common.errorGenerator(error,error));
	});
});

//更新密碼
//格式:token,userid,old_password,new_password
app_server.post('/updatePasswords',function(req, res){
	var logger = common.getLogger('/updatePasswords');

	logger('收到資料:'+JSON.stringify(req.body));
	//檢查token
	UserManager.checkToken(req.body.data.token)
	.then(function(result){
		//token有效
		UserManager.updatePasswords(req.body.data.userid,req.body.data.old_password,req.body.data.new_password)
		.then(function(result){
			logger('更新成功，更新後資料:');
			console.dir(result.rows);
			res.send(common.dataPacketGenetor("OK",{message:'密碼更新成功!',data:{userid:result.userid}}));
		}).catch(function(error){
			logger(error);
			res.send(common.errorGenerator(error,error));
		});
	}).catch(function(error){
			logger(error);
			res.send(common.errorGenerator(error,error));
	});

});

//更新使用者資料
//格式:token,userid,data
app_server.post('/updateProfile',function(req, res){
	var logger = common.getLogger('/updateProfile');

	logger('收到資料:'+JSON.stringify(req.body));
	//檢查token
	UserManager.checkToken(req.body.data.token)
		.then(function(result){
			return UserManager.updateUserInfo(common.objClone(req.body.data.userid),common.objClone(req.body.data.data))




		}).then(function(result){
			res.send(common.dataPacketGenetor("OK",{message:'使用者資料更新成功!!',data:{userid:result.userid}}));
		}).catch(function(error){
			logger(error);
			res.send(common.errorGenerator(error,error));
		});
});


//取得使用者資料
//格式:token,userid
app_server.post('/getUserProfile',function(req, res){
	var logger = common.getLogger('/getUserProfile');

	logger('收到資料:'+JSON.stringify(req.body));
	//檢查token
	UserManager.checkToken(req.body.data.token)
		.then(function(result){
			return UserManager.getUserInfo(req.body.data.userid)

		}).then(function(result){
			delete result.passwords;
			res.send(common.dataPacketGenetor("OK",{message:'取得使用者資料!!',data:result}));
		}).catch(function(error){
			logger(error);
			res.send(common.errorGenerator(error,error));
		});
});



//服務器開始
app_server.listen(config.server.port, function () {
  logger('Example app listening on port 3000!');
});
