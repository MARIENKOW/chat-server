import express from "express";
import cors from "cors";
import router from './router.js'
import * as dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import http from 'http';
import { Server } from 'socket.io'

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
   sock.on("private message", ({ message, to }) => {
      sock.to(to).emit("private message", {
         message,
         from: sock.id,
      });
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