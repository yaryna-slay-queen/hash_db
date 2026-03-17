##hash_db
A user management CLI built with Node.js + PostgreSQL.

**#Commands**
**Register**: node app.js add name "User" email "a@b.com" password "123"
**Login**: node app.js login email "a@b.com" password "123"
**List All**: node app.js list
**Delete**: node app.js delete [ID]

***Passwords are encrypted using Bcrypt.***
