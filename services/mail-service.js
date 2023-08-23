import nodemailer from "nodemailer";
import config from "../config.js";

class MailService {
   constructor() {
      this.transporter = nodemailer.createTransport(config.mail);
   }
   async sendMessage(email, link, obj) {
      const change = {
         subject: 'Change Your Password',
         text: 'you have 30 minutes',
         html:
            `<div>
         <h1>For change tap on link</h1>
         <a href='${link}'>${link}</a>
      </div>`}
      const activate = {
         subject: 'Activations for Chat',
         text: '',
         html:
            `<div>
         <h1>For activation tap on link</h1>
         <a href='${link}'>${link}</a>
      </div>`}
      const inner = obj = 'change'? change : activate
      await this.transporter.sendMail({
         from: process.env.SMTP_USER,
         to: email,
         ...inner
      })
   }
}

export default new MailService();