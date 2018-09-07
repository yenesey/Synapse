//look at emailjs/readme.md for more details

var email   = require("emailjs/email");
var server  = email.server.connect({
	user:    "", 
	password:"", 
  host:    "KREX02.ifcbank.loc",
	port: 25
});

console.log(JSON.stringify(serverm, null, " "));

var message = {
   from:    "XTech <X@Tech.ru>", 
   to:      "someone <dbogachev@mfk-bank.ru>, another <dkhmelev@mfk-bank.ru>",
   subject: "testing emailjs",
   text:    "i hope this works",

   attachment: 
   [
      {data:"<html>i <i>hope</i> this works!</html>", alternative:true},
      {path:"test.zip", type:"application/zip", name:"renamed.zip"}
   ]

};


// send the message and get a callback with an error or details of the message that was sent
server.send(message, function(err, message) { console.log(err || message); });

// you can continue to send more messages with successive calls to 'server.send', 
// they will be queued on the same smtp connection

// or you can create a new server connection with 'email.server.connect' 
// to asynchronously send individual emails instead of a queue