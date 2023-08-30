import express from "express";
import cors from "cors";
import router from './router.js'
import * as dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import http from 'http';
import { Server } from 'socket.io'
import DB from "./services/DB.js";

dotenv.config()

const PORT = process.env.PORT;

const app = express();
app.use(express.json())
app.use(cookieParser());
app.use(cors({
   credentials: true,
   origin: process.env.CLIENT_URL,
}));
app.use('/', router);

const web = http.Server(app);

const io = new Server(web, {
   cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
   }
})
io.use((socket, next) => {
   const { username, id } = socket.handshake.auth;
   if (!username || !id) return next(new Error("invalid request"));
   socket.username = username;
   socket.id = id;
   next();
});


io.on('connection', (sock) => {
   sock.on("private message", async({ message, to }) => {
      const [chat] = await DB.query(`SELECT structure.chat_id FROM user INNER JOIN structure ON user.id = structure.user_id where user.id = ${sock.id} and structure.with_id = ${to}`);
      const now = new Date()
      const date = `${`${now.getDate()}`.length !== 1 ? now.getDate() : `0${now.getDate()}`}.${`${now.getMonth()}`.length !== 1 ? now.getMonth() : `0${now.getMonth()}`}.${now.getFullYear()}`;
      const time = `${`${now.getHours()}`.length !== 1 ? now.getHours() : `0${now.getHours()}`}:${`${now.getMinutes()}`.length !== 1 ? now.getMinutes() : `0${now.getMinutes()}`}:${`${now.getSeconds()}`.length !== 1 ? now.getSeconds() : `0${now.getSeconds()}`}`;
      if(chat[0]){
         await DB.query(`INSERT into message VALUES(null,'${message}',${chat[0].chat_id},${sock.id},'${date}','${time}');`)
      }else{
         const [insertInfo] = await DB.query(`INSERT into chat values (null)`);
         const {insertId:chat_id} = insertInfo;
         await DB.query(`INSERT into message VALUES(null,'${message}',${chat_id},${sock.id},'${date}','${time}');`)
         await DB.query(`INSERT into structure values (null,${sock.id},${chat_id},${to}),(null,${to},${chat_id},${sock.id})`)
      }
      sock.to(to).emit("private message", {
         message:{value:message,from: sock.id,date,time},
         user:sock.id
      });

      sock.emit("private message",{
         message:{value:message,from: sock.id,date,time},
         user:to
      })
   });

   //! ///---ONLIN/Offline---\\\ !\\

   const users = [];
   for (let arr of io.of("/").sockets) {
      users.push({
         id: arr[0],
         username: arr[1].username,
      });
   }

   sock.broadcast.emit(`users`, users); //отправить всем когда подключаешься
   sock.emit(`users`, users); //отправить только себе когда подключвешься    
   sock.on('disconnect', () => {
      const users = [];
      for (let arr of io.of("/").sockets) {
         users.push({
            id: arr[0],
            username: arr[1].username,
         });
      }
      sock.broadcast.emit(`users`, users);
   })
   sock.on('findOnlineUsers',(users)=>{
      const sockUsers = [...io.of("/").sockets]
      const onlineUsers = users.map((el)=>{
         el.online = false;
         if(sockUsers.find((elem)=>elem[0]===el.id)){
            el.online = true;
         }
         return el;
      })
      sock.emit('findOnlineUsers',onlineUsers)
   })
})

try {
   web.listen(PORT, process.env.SERVER_URL, () => console.log('Server is working'))

} catch (e) {
   console.log(`${e.message}`);
}