var config = require('./config.js');
var mongodb = require('mongodb');
var mysql = require('mysql');
var cm = require ('./comminFunctions');

//初始化mongodb
//簡單的連接即可創建資料庫
var Mongo_Client = new mongodb.MongoClient();
var url = 'mongodb://' + config.mongodb_connect_config.host + ':' + config.mongodb_connect_config.port + '/' + config.mongodb_connect_config.database;
Mongo_Client.connect(url, function(err, db) {
    db.collection('user');
    if(err){
        console.log('mongodb 初始化失敗!!');
        console.log(err);
    };
    db.collection('user');
});

//初始化MYSQL
//包裝成Promise的mysqlQuerry
var mysql_connection = null;
var mysql_promise = {
    query:function(query,placeholders ){
        var logger = cm.getLogger('mysql_promise.query');

        return new Promise(function(resolve,reject){

            function resultHandler(err,rows,firlds){
                //logger('633')
                if (err) {
                    //logger(err)
                    reject(err);
                    return;
                };
                //console.dir({rows:rows,firlds:firlds});
                resolve({rows:rows,firlds:firlds});
            }
            if(placeholders) var _query = mysql_connection.query(query,placeholders,resultHandler);
            else var _query = mysql_connection.query(query,resultHandler);
            logger('送出的query:'+_query.sql);
        });
    }

};

var connectUserDB = function(option){
    return new Promise(function(resolve,reject){
        mysql_connection = mysql.createConnection(option);
        mysql_connection.connect(function(error){
            if(error)reject(error);
            else resolve();
        });
        /*var mysql_connection = mysql.createConnection({
         host: '127.0.0.1',
         user: 'root',
         password: '',
         database: 'usersample'
         });*/

    });

}

var option = {
    host:config.mysql_connect_config.host,
    user:config.mysql_connect_config.user,
    password:config.mysql_connect_config.password
};

/*
 userid    | char(20)
 passwords | char(50)
 name      | char(20)
 age       | tinyint(4) unsigned
 */

connectUserDB(option)
.then(result => {
    return mysql_promise.query('CREATE DATABASE IF NOT EXISTS '+config.mysql_connect_config.database)
}).then(result => {
    return mysql_promise.query('USE '+config.mysql_connect_config.database)
}).then(result => {
    return mysql_promise.query('CREATE TABLE IF NOT EXISTS user ( userid char(20),passwords char(50),name char(20),age tinyint(4) unsigned )')
}).then(result => {
    return mysql_promise.query('INSERT INTO user (userid,passwords,name,age) VALUES ("test","3f14b6841ab09dc36d32a3d6f80ade58","TESTer",19)')
}).catch(error=>{
    console.log(error);
});