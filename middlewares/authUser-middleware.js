import token from '../services/token-service.js';

const authMiddleware = (req,res,next)=>{
   try{
      const authorizationHeader = req.headers.authorization
      if(!authorizationHeader) {
         res.status(401).json('not authorized')
         return next('not authorized');
      }

      const accessToken = authorizationHeader.split(' ')[1];

      if(!accessToken) {
         res.status(401).json('not authorized')
         return next('not authorized');
      }

      const userData = token.validateAccessToken(accessToken);
      if(!userData) {
         res.status(401).json('not authorized')
         return next('not authorized');
      }
      req.user = userData;
      next();
   }catch(e){
      res.status(500).json('some Error in middleware')
      return next('some Error in middleware');
   }
}

export default authMiddleware;