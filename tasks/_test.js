/*
 "use strict"
var 
	lite = require('./core/sqlitedb.js')();

//'UPDATE users SET login="bogachev_di_2" WHERE id =100'
//'select id, login from users'

lite({db:'db/synapse.db', sql:"SELECT name,lower(description) FROM vw_user_deps"})
.then(res=>console.log(res))
.catch(err=>console.log('err: ' + err.stack));
*/

var ldap = require('./core/ds_ldap.js')({
	dc:'ldap://kr-dc-02.ifcbank.loc/', 
	domain:'ifcbank', 
	dn:'DC=ifcbank,DC=loc', 
	user:'finereader_0002', 
	password:'1qaz2wsx'
});

ldap({query:'(cn=Бог*)'})
.then(res=>console.log(JSON.stringify(res, null, " ")))
.catch(err=>console.log(err.stack))










