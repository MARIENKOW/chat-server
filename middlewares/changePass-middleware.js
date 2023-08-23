import token from '../services/token-service.js';
import DB from '../services/DB.js';

const changePassMiddleware = async (req, res, next) => {
   try {
      const { rememberPassLink } = req.body
      if (!rememberPassLink) {
         res.status(400).json('not valid request')
         return next('not valid request');
      }

      const [rezult] = await DB.query(`SELECT * from rememberPass where rememberPassLink = '${rememberPassLink}'`)

      if(rezult.length ===  0) {
         res.status(400).json('time to change pass is gone')
         return next('time to change pass is gone')
      }
      const [response] = await DB.query(`SELECT * from rememberPass where rememberPassLink = '${rememberPassLink}' and dateEndChange > now()`)

      if(response.length ===  0) {
         res.status(400).json('time to change pass is gone')
         return next('time to change pass is gone')
      }

      next();
   } catch (e) {
      res.status(500).json('some Error in middleware')
      return next('some Error in middleware');
   }
}

export default changePassMiddleware;