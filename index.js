import express from "express";
import cors from "cors";
import router from './router.js'
import * as dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import http from 'http';
import { Server } from 'socket.io'
import { disconnect } from "process";

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

const socket = new Server(web, {
   cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
   }
})

socket.on('connection', (sock) => {
   sock.on('message',(data)=>{
      socket.emit('response',data)
   })
   sock.on('disconnect', () => {
      console.log(`${sock.id} disconnect`);
   })
})

try {
   web.listen(PORT, process.env.SERVER_URL, () => console.log('Server is working'))

} catch (e) {
   console.log(`${e.message}`);
}