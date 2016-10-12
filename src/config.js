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
};

cinfig.mongodb_connect_config = {
    host: 'localhost',
    port: '27017',
    database: 'usersample'
};

cinfig.server = {
    //Token有效時長(秒)
    TokenExpiration:60,
    port:3000
};

cinfig.client = {
    //Token有效時長(秒)
    ServerIP:'127.0.0.1',
    port:3000
};