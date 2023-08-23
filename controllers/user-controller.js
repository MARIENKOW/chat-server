import DB from '../services/DB.js';
import bcrypt from 'bcrypt'
import { v4 } from 'uuid';
import mailService from '../services/mail-service.js'
import token from '../services/token-service.js';


class Controller {

   signIn = async (req, res) => {
      const clientError = {
         badValidation: false,
         emailNotDefined: false,
         accNotActivated: false,
         passNotCorrect: false
      }
      try {
         const { email, password } = req.body;
         if (!email || !password) return res.status(400).json({ ...clientError, badValidation: true })
         const [mailFromDB] = await DB.query(`SELECT * from user where email = '${email}'`);
         if (mailFromDB.length === 0) return res.status(400).json({ ...clientError, emailNotDefined: true })
         const dbPass = mailFromDB[0].password;
         const isPassEquals = await bcrypt.compare(password, dbPass);
         if (!isPassEquals) return res.status(400).json({ ...clientError, passNotCorrect: true })
         if (!mailFromDB[0].isActivated) return res.status(400).json({ ...clientError, accNotActivated: true })
         console.log('sdfsdf');
         const tokens = token.generateTokens({ id: mailFromDB[0].id, email })
         await token.saveToken(mailFromDB[0].id, tokens.refreshToken);
         await res.cookie('refreshToken', tokens.refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
         res.status(200).json({
            accessToken: tokens.accessToken,
            user: mailFromDB[0]
         })
      } catch (e) {
         console.log(e);
         res.status(500).json(e.message)
      }
   }

   signUp = async (req, res) => {
      try {
         const clientError = {
            badValidation: false,
            notUniqueEmail: false,
         }
         const { username, email, password, ['re-enter password']: rePassword } = req.body;

         if (!username || !email || !password || !rePassword || password !== rePassword) return res.status(400).json({ ...clientError, badValidation: true })

         const [rezult] = await DB.query(`SELECT email from user where email = '${email}'`)

         if (rezult.length > 0) return res.status(400).json({ ...clientError, notUniqueEmail: true })

         const hashPassword = await bcrypt.hash(password, 5);
         const activationLink = v4();
         await mailService.sendMessage(email, `${process.env.API_URL}/activate/${activationLink}`)

         const [info] = await DB.query(`INSERT INTO user VALUES (NULL, '${username}', '${email}', '${hashPassword}', '${activationLink}', NULL , false);`)
         const tokens = token.generateTokens({ id: info.insertId, email })
         await token.saveToken(info.insertId, tokens.refreshToken);
         // res.cookie('refreshToken', tokens.refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
         res.status(200).json(true)
      } catch (e) {
         res.status(500).json(e.message)
      }
   }

   activate = async (req, res) => {
      try {
         const { activationLink } = req.params
         const [user] = await DB.query(`SELECT id from user where activationLink = '${activationLink}'`);
         if (user.length === 0) return res.status(400).json('activation Link is not fined');
         const ans = await DB.query(`UPDATE user set isActivated = true where id = ${user[0].id}`);
         // console.log(process.env.CLIENT_URL);
         res.redirect(process.env.CLIENT_URL)
      } catch (e) {
         res.status(500).json(e.message)
      }
   }

   logOut = async (req, res) => {
      try {
         const { refreshToken } = req.cookies;
         res.clearCookie('refreshToken')
         await token.removeToken(refreshToken);
         res.status(200).json(true)
      } catch (e) {
         res.status(500).json(e.message)
      }
   }

   refresh = async (req, res) => {
      try {
         const { refreshToken } = req.cookies;
         if (!refreshToken) return res.status(401).json('not authorized user');

         const ansData = token.validateRefreshToken(refreshToken);
         const userData = await token.findToken(refreshToken);
         if (!ansData || !userData) return res.status(401).json('not authorized user');
         const tokens = token.generateTokens({ id: userData.id, email: userData.email })
         await token.saveToken(userData.id, tokens.refreshToken);
         await res.cookie('refreshToken', tokens.refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
         res.status(200).json(tokens.accessToken)
      } catch (e) {
         res.status(500).json(e.message)
      }
   }
   aboutUser = async (req, res, next) => {
      try {
         const { refreshToken } = req.cookies
         if (!refreshToken) return res.status(401).json('not Authorization')
         const [aboutUser] = await DB.query(`SELECT * from user where refreshToken = '${refreshToken}'`);
         return res.json(aboutUser[0])
      } catch (e) {
         res.status(500).json(e.message)
         console.log(e);
      }
   }
   checkAuthUser = async (req, res) => {
      try {
         return res.json(true)
      } catch (e) {
         res.status(500).json(e.message)
      }
   }
   rememberPassword = async (req, res) => {
      try {
         const { email } = req.body;
         const [rezult] = await DB.query(`SELECT * from user where email = '${email}'`)

         if (rezult.length === 0) return res.status(400).json({ emailIsNotDefined: true })

         const rememberPassLink = v4();
         const user_id = rezult[0].id;

         await DB.query(`DELETE FROM rememberPass WHERE user_id = ${user_id}`)

         const response = await DB.query(`INSERT into rememberPass values (null,'${rememberPassLink}','${user_id}',TIMESTAMPADD(MINUTE,30,NOW()))`)
         mailService.sendMessage(rezult[0].email, `${process.env.CLIENT_URL}/ChangePass/${rememberPassLink}`, 'change')
         return res.json(response)
      } catch (e) {
         res.status(500).json(e.message)
      }
   }

   changePass = async (req, res) => {
      try {
         const { rememberPassLink, password, ['re-enter password']: reEntPass } = req.body;
         if (password !== reEntPass) return res.status(400).json('re-entered password is not correct')
         const hashPassword = await bcrypt.hash(password, 5);

         await DB.query(`UPDATE user INNER JOIN rememberPass ON user.id = rememberPass.user_id SET user.password = '${hashPassword}' WHERE rememberPass.rememberPassLink = '${rememberPassLink}'`);
         await DB.query(`DELETE FROM rememberPass WHERE rememberPassLink = '${rememberPassLink}'`)
         res.json(true)
      } catch (e) {
         console.log(e);
         res.status(500).json(e.message)
      }

   }
   checkChangePassLink = async (req, res) => {
      try {
         return res.json(true)
      } catch (e) {
         res.status(500).json(e.message)
      }
   }
}
export default new Controller();

