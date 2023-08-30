class SocketService{

   currentOnlineUsers = (target,sock)=>{
      if(!target) return []
      const onlineUsers = target.filter(el => {
         return [...sock.of("/").sockets].find(o => o[0] === el);
      });
      return onlineUsers
   }
}

export default new SocketService();