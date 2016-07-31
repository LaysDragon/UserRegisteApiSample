//===初始化===

//==初始化 mysql
var mysql = require('mysql');

//建立連線
var mysql_connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'usersample'
});

//開始連接
mysql_connection.connect();


//==初始化 mongodb
var mongodb = require('mongodb');

var mongodb_Server = new mongodb.Server('localhost', 27017, { auto_reconnect: true});

var mongodb_db = new mongodb.Db('usersample', mongodb_Server);

//==初始化 express
var express = require('express');


//====主程式開始====
//服務器配置
var app_server = express();

app_server.get('/', function(req, res) {
  res.send('hello world');
});

//路由配置
app_server.post('/login',function(req, res){
	res.send('login');

});

app_server.post('/logout',function(req, res){
	res.send('logout');

});

app_server.post('/createUser',function(req, res){
	res.send('createUser');

});

app_server.post('/deleteUser',function(req, res){
	res.send('deleteUser');

});

app_server.post('/updatePassword',function(req, res){
	res.send('updatePassword');

});

app_server.post('/updateProfile',function(req, res){
	res.send('updateProfile');

});

app_server.post('/getUserProfile',function(req, res){
	res.send('getUserProfile');

});

//服務器開始
app_server.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});