const socketMidleware = (socket, next) => {
   const { username, id } = socket.handshake.auth;
   if (!username || !id) return next(new Error("invalid request"));
   socket.username = username;
   socket.id = id;
   next();
}

export default socketMidleware