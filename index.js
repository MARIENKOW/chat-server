import express from "express";
import cors from "cors";
import router from './router.js'
import * as dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import http from 'http';
import { Server } from 'socket.io'
import socketMidleware from "./middlewares/socket-middleware.js";
import socketService from "./services/socket-service.js";
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

io.use(socketMidleware);

io.on('connection', (sock) => {
   sock.on("private message", async ({ message, to }) => {
      try {
         const [chat] = await DB.query(`SELECT structure.chat_id FROM user INNER JOIN structure ON user.id = structure.user_id where user.id = ${sock.id} and structure.with_id = ${to}`);
         const now = new Date()
         const date = `${`${now.getDate()}`.length !== 1 ? now.getDate() : `0${now.getDate()}`}.${`${now.getMonth()}`.length !== 1 ? now.getMonth() : `0${now.getMonth()}`}.${now.getFullYear()}`;
         const time = `${`${now.getHours()}`.length !== 1 ? now.getHours() : `0${now.getHours()}`}:${`${now.getMinutes()}`.length !== 1 ? now.getMinutes() : `0${now.getMinutes()}`}:${`${now.getSeconds()}`.length !== 1 ? now.getSeconds() : `0${now.getSeconds()}`}`;
         if (chat[0]) {
            await DB.query(`INSERT into message VALUES(null,'${message}',${chat[0].chat_id},${sock.id},'${date}','${time}');`)
         } else {
            const [insertInfo] = await DB.query(`INSERT into chat values (null)`);
            const { insertId: chat_id } = insertInfo;
            await DB.query(`INSERT into message VALUES(null,'${message}',${chat_id},${sock.id},'${date}','${time}');`)
            await DB.query(`INSERT into structure values (null,${sock.id},${chat_id},${to}),(null,${to},${chat_id},${sock.id})`)
         }
         sock.to(to).emit("private message", {
            message: { value: message, from: sock.id, date, time },
            user: sock.id
         });

         sock.emit("private message", {
            message: { value: message, from: sock.id, date, time },
            user: to
         })
      }
      catch (e) {
         console.log(e);
      }
   });


   //! ///---ONLIN/Offline DataUsers---\\\ !\\



   sock.on('onlineUsers', (users) => { //current online users for me
      sock.users = users;
      const onlineUsers = socketService.currentOnlineUsers(sock.users, io)
      sock.emit('onlineUsers', onlineUsers)
   })

   const allUsers = [...io.of("/").sockets]  //new online users for all
   allUsers.forEach((arr) => {
      const onlineUsers = socketService.currentOnlineUsers(arr[1].users, io)
      sock.to(arr[0]).emit('onlineUsers', onlineUsers)
   });

   sock.on('disconnect', () => { //new online users for all
      const allUsers = [...io.of("/").sockets]
      allUsers.forEach((arr) => {
         const onlineUsers = socketService.currentOnlineUsers(arr[1].users, io)
         sock.to(arr[0]).emit('onlineUsers', onlineUsers)
      });
   })



   //! ///---find online usesrs when search---\\\ !\\

   sock.on('findOnlineUsers', (users) => {
      const onlineUsers = socketService.currentOnlineUsers(users, io)
      sock.emit('findOnlineUsers', onlineUsers)
   })


})

try {
   web.listen(PORT, process.env.SERVER_URL, () => console.log('Server is working'))

} catch (e) {
   console.log(`${e.message}`);
}