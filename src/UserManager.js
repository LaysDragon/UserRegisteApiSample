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

	var defaultAdminUser =['test'];



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
	//包裝成Promise的mysqlQuerry
	var mysql_promise = {
		query:function(query){
			var logger = cm.getLogger('mysql_promise.query');

			return new Promise(function(resolve,reject){
				logger('送出query:'+query);
				mysql_connection.query(query,function(err,rows,firlds){
					//logger('633')
					if (err) {
						//logger(err)
						reject(err);
						return;
					};
					//console.dir({rows:rows,firlds:firlds});
					resolve({rows:rows,firlds:firlds});
				});
			});
		}

	};


	//取得使用者資料
	//返回{rows:rows,firlds:firlds}
	um.NO_SUCH_USER_ERROR='無此使用者';
	this.getUserInfo = function(userid){
		var logger = cm.getLogger('UserManager.getUserInfo');

		//return new Promise(function(resolve,reject){
			var query = 'SELECT * FROM user WHERE userid = "'+userid+'"';
			return mysql_promise.query(query)
			.then(function(result){
				//console.dir(result);
				//由於加入這個防呆會需要大量修改userServer,userManager邏輯結構，所以暫時不改
				//照理來說應該直接回傳使用者資料並且做好防呆而不是SQL的直接返回資料
				if(result.rows.length == 0) return Promise.reject(um.NO_SUCH_USER_ERROR);
				return result.rows[0];
			});

			/* mysql_connection.query(query,function(err,rows,firlds){
				if (err) reject(err);
				resolve({rows:rows,firlds:firlds});
			}); */
		//});
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
				//if(result.rows.length!=0){
					logger("已經有此使用者!");
					reject('已經有此使用者!');
					return;
				// }


				/* mysql_connection.query(query,function(err,rows,firlds){
					if (err){
						reject(err)
						return;
					};
					resolve({rows:rows,firlds:firlds});
				}); */

			}).catch(function(error){
				//確定無重複使用者，進行添加
				if(error==um.NO_SUCH_USER_ERROR){
					logger("確定無重複使用者，進行添加");
					data.passwords = common.encryptPassword(data.passwords,data.userid);
					var query = 'INSERT INTO user (userid,passwords,name,age) VALUES (\''+data.userid+'\',\''+data.passwords+'\',\''+data.name+'\',\''+data.age+'\')';
					mysql_promise.query(query)
					.then(function(result){
						resolve(result);
					}).catch(function(error){
						reject(error);
					});
					return;
				}
				reject(error);
			});


		}.bind(this));


	}



	this.deleteUser = function(userid){
		var logger = cm.getLogger('UserManager.deleteUser');

		return new Promise(function(resolve,reject){
			//檢查是否為預設使用者
			logger('檢查是否為預設使用者');
			if(defaultAdminUser.indexOf(userid)>=0){
				reject(new Error('預設使用者無法刪除!!!'))
				return ;
			};
			logger('非預設使用者，可以刪除');
			//檢查是否有此使用者
			this.getUserInfo(userid)
			.then(function(result){
				//if(result.rows.length!=0){
					logger('有此使用者!');
					console.dir(result);
					return userid;
				//}
				//查無此使用者
				//reject(new Error('查無此使用者'));
				//return Promise.reject(new Error('查無此使用者'));
			})
			.catch(function(error){
				reject(error);
			})
			.then(function(value){

				//有就送出刪除querry
				var query = 'DELETE FROM user WHERE userid = \''+userid+'\'';
				logger('送出刪除query:'+query);

				mysql_promise.query(query)
				.then(function(result){
					logger('刪除成功');
					resolve(result);
				}).catch(function(error){
					logger(error);
					reject(error)
				});

				//順便清除token
				this.getUserToken(userid)
				.then(function(result){
					return this.deleteToken(result);

				}.bind(this))
				.then(function(result){
					logger('順便清除token完畢');
				}).catch(function(result){
					logger(error);
				});
			}.bind(this))
			.catch(function(error){
				logger(error);
				reject(error);
			});
		}.bind(this));

	}.bind(this);

	//更新密碼
	//返回:更新後的userinfo
	this.updatePasswords = function(userid,old_password,new_password){
		var logger = cm.getLogger('UserManager.updatePasswords');
		var userid = userid;
		logger('更新使用者['+userid+']密碼"'+old_password+'"=>"'+new_password+'"');
		return new Promise(function(resolve,reject){
			this.getUserInfo(userid)
			.then(function(result){
				// if(result.rows.length==0){
				// 	logger('無此使用者!!');
				// 	reject('無此使用者!!');
				// 	return;
				// }


				//檢查密碼是否一致
				//console.dir(result);
				if(common.comparePassword(old_password,result.passwords,result.userid)){
					//密碼一致，更新密碼
					//logger('更新使用者['+userid+']密碼"'+old_password+'"=>"'+new_password+'"');
					query = 'UPDATE user SET passwords="'+ common.encryptPassword(new_password,userid)+'" WHERE userid= "'+userid+'"'
					mysql_promise.query(query)
					.then(function(result){
						//更新成功
						//返回新的info
						logger('更新成功，返回新的info，');
						this.getUserInfo(userid)
						.then(function(result){
							resolve(result);
						}).catch(function(error){
							reject(error);
						});
					}.bind(this)).catch(function(error){
						reject(error);
					});

				}else{
					reject('密碼不一致!!');
				}

			}.bind(this)).catch(function(error){
				reject(error);
			});


		}.bind(this));




	}.bind(this);

	//更新使用者資料
	this.updateUserInfo = function(userid,data){
		return new Promise(function(resolve,reject){
			//檢測使用者是否存在
		});
	}.bind(this);

	//===mysql相關結束===

	//設置Token有效期限
	//預設:0 => 無期限
	this.setTokenExpiration = function(time){
		TokenExpiration = time;
	}.bind(this);


	//*檢查Token是否有效
	//返回:token對應的userid
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
						resolve(result[0].userid);
						return;
					}

					//Token失效，進行刪除

					logger('Token失效，進行刪除');

					//Mongo_collection_user.deleteOne({_id:result[0]._id})


					this.deleteToken(result[0].token)
					.then(function(_result){
						//logger('[checkToken]Token失效，已刪除 _id:'+ result[0]._id);
						//console.dir(result);
						reject('Token失效');
					}).catch(function(error){
						//logger('[checkToken]Token失效，刪除失敗:');
						//console.dir(error);
						reject(error);
					});

					//return;
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

	//取得token



}
