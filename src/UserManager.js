um = exports;
var common = require ('./comminFunctions');

var mongodb = require('mongodb');
var mysql = require('mysql');

var static_instance = null;
um.UserManager=function(){
	return static_instance!==null?static_instance:(static_instance = new UserManager());
}



function UserManager(){
	var Mongo_Client = new mongodb.MongoClient();
	var Mongo_DB = null;
	var Mongo_collection_user = null;
	
	var mysql_connection = null;
	
	var TokenExpiration = 0;
	
	
	
	//==初始化 mongodb
	this.connectTokenDB = function(address,port,database){
		
		
		var url = 'mongodb://'+address+':'+port+'/'+database;
		return new Promise(function(resolve,reject){
			Mongo_Client.connect(url, function(err, db) {
				
				if(err){
					reject(err);
					return;
				};

				
				Mongo_DB = db;
				Mongo_collection_user = db.collection('user');
				
				resolve(db);
				
			});
		});
		
	}.bind(this);
	//==初始化 mysql
	
	this.connectUserDB = function(option){
		
		mysql_connection = mysql.createConnection(option);
		mysql_connection.connect();
		/*var mysql_connection = mysql.createConnection({
			host: '127.0.0.1',
			user: 'root',
			password: '',
			database: 'usersample'
		});*/
	}.bind(this);
	
	//===mysql相關===
	
	//取得使用者資料
	//返回{rows:rows,firlds:firlds}
	this.getUserInfo = function(userid){
		return new Promise(function(resolve,reject){
			query = 'SELECT * FROM user WHERE userid = "'+userid+' "';
			mysql_connection.query(query,function(err,rows,firlds){
				if (err) reject(err);
				resolve({rows:rows,firlds:firlds});
			});
		});
	}.bind(this);
	
	//創建使用者
	/*data{
	 *	userid
	 *	passwords
	 *	name
	 *	age
	 *	}
	 * 返回:結果
	 */
	
	this.createUser= function(data){
		var logger = cm.getLogger('UserManager.createUser');
		
		return new Promise(function(resolve,reject){
			//檢查使用者是否重複
			logger("檢查使用者是否重複");
			this.getUserInfo(data.userid)
			.then(function(result){
				//logger('使用者查詢結果:');
				//console.dir(result);
				if(result.rows.length!=0){
					logger("已經有此使用者!");
					reject('已經有此使用者!');
					return;
				}
				//確定無重複使用者，進行添加
				logger("確定無重複使用者，進行添加");
				data.passwords = common.encryptPassword(data.passwords,data.userid);
				query = 'INSERT INTO user (userid,passwords,name,age) VALUES (\''+data.userid+'\',\''+data.passwords+'\',\''+data.name+'\',\''+data.age+'\')';
				mysql_connection.query(query,function(err,rows,firlds){
					if (err){ 
						reject(err)
						return;
					};
					resolve({rows:rows,firlds:firlds});
				});
			
			}).catch(function(error){
				reject(error);
			});
			
			
		}.bind(this));
		
		
	}
	//===mysql相關結束===
	
	//設置Token有效期限
	//預設:0 => 無期限
	this.setTokenExpiration = function(time){
		TokenExpiration = time;
	}.bind(this);
	
	
	//*檢查Token是否有效	
	this.checkToken= function(token){
		var logger = cm.getLogger('UserManager.checkToken');
		
		//如果期限為0則無期限
		if(TokenExpiration==0)return Promise.resolve(true);
		return new Promise(function(resolve,reject){
			Mongo_collection_user.find({token:token}).toArray()
			.then(function(result){
				logger("查詢結果:");
				console.dir(result);
				
				if(result.length!=0){
					
					var tokenDate = result[0]._id.getTimestamp();
					var currentDate = new Date();
					var time = currentDate.getTime() - tokenDate.getTime();
					time = Math.floor(time/1000);
					
					if( time < TokenExpiration  ){
						
						logger('Token有效');
						resolve(true);
						return;
					}
					
					//Token失效，進行刪除
					logger('Token失效，進行刪除');
					
					//Mongo_collection_user.deleteOne({_id:result[0]._id})
					
					this.deleteToken(result[0].token);
					/*.then(function(_result){
						logger('[checkToken]Token失效，已刪除 _id:'+ result[0]._id);
						//console.dir(result);
					}).catch(function(error){
						logger('[checkToken]Token失效，刪除失敗:');
						console.dir(error);
					});*/
					reject('Token失效');
					return;
				}
				//查無此Token
				
				reject('查無此Token');
			}.bind(this));
		}.bind(this));
		
	}.bind(this);
	
	//給使用者分配token
	//如果使用者已經有錄入Token則失敗
	this.createTokenForUser = function(userid){
		var logger = cm.getLogger('UserManager.createTokenForUser');
		
		return new Promise(function(resolve,reject){
			//檢查是否已經有錄入Token
			this.getUserToken(userid)
			.then(function(result){
				reject('該userid已經有錄入Token');
			}).catch(function(error){
				//沒有token。分配token!
				var token = common.getToken();
				//錄入token
				Mongo_collection_user.insert({token:token,userid:userid},function(err, result){
					if(err){
						reject(err)
						return;
					};
					logger("給使用者["+userid+"]分配並錄入新的時間戳token:"+token);
					resolve(token);
				});
			});
			
			
		}.bind(this));
	}.bind(this);
	
	this.deleteToken=function(token){
		var logger = cm.getLogger('UserManager.deleteToken');
		
		return new Promise(function(resolve,reject){
			Mongo_collection_user.deleteOne({token:token})
					.then(function(result){
						logger('已刪除 token:'+ token);
						resolve(token);
						//console.dir(result);
					}).catch(function(error){
						logger('刪除失敗:');
						console.dir(error);
						reject(error);
					});
			
			
		});
	}
	
	//*取得使用者的Token
	//返回:Promise
	this.getUserToken= function(userid){
		return new Promise(function(resolve,reject){
			
			var result = Mongo_collection_user.find({userid:userid}).toArray();
			result.then(function(result){
				if(result.length!=0){
					resolve(result[0].token);
				}
				reject("沒有Token");
			});
			
			
		});
		
	}.bind(this);
	
	
	
}