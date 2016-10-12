/**
 * Created by LaysDragon on 2016/10/10.
 */

cinfig = exports;
//設定區
cinfig.mysql_connect_config = {
    host: '127.0.0.1',
    user: 'root',
    password: 'test',
    database: 'usersample'
}

cinfig.mongodb_connect_config = {
    host: 'localhost',
    port: '27017',
    database: 'usersample'
}

cinfig.server = {
    //Token有效時長(秒)
    TokenExpiration:10,
    port:3000
}