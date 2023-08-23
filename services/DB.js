
import mysql from 'mysql2/promise';
import config from '../config.js';


async function query(sql, params) {
   const connection = await mysql.createConnection(config.db);
   const resp = await connection.execute(sql);
   connection.end(function (err) {
      if (err) {
         console.log(err.message);
      }
   });
   return resp;
}

export default { query }
