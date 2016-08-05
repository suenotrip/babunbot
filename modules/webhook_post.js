// READ!!! http://stackoverflow.com/questions/18153410/how-to-use-q-all-with-complex-array-of-promises
var fb = require("./fb");
var emojis = ["(y)","<3",":)",":(",":p",":/",":D"];
var Q = require("q");
var Adapter = require("./Adapter");
var db = new Adapter();
var nlp = require("./nlp");
var _ = require("underscore");
var http = require('http');
var request = require('request');
//var dashbot=require("./dashbot");
var dashbot = require('dashbot')(process.env.DASHBOT_API_KEY).facebook;
//------------------------------------------------------------------------------
module.exports = function(req,res,next){
    // Tell FB that we have received the request by ending it.
    // Without this, the request will timeout and FB will resend it
    // causing you to accidentally spam the user.

	
	//var action=req.body.action || "facebook";
	//var paused=req.body.paused || "facebook";
	
	//console.log("==dashbot params",paused);
	 res.end();
//if the call is from dashbot for pausing and unpausing the bot
if(req.body.hasOwnProperty("paused"))
{
	console.log("===Received a message from dashbot");
	var senderId=req.body.userId;
	console.log("===dashbot user_id=",senderId);
	var paused=req.body.paused;
	if(paused)
	{
	console.log("===paused inside true===");
		updateUserStatus(senderId,0);
	}
	else{
	console.log("===paused inside false===");
	updateUserStatus(senderId,1);
	}
	
	//return fb.reply(fb.textMessage("So you are back with Babun Bot. Say HELLO to get started."),senderId);
}
else if	(req.body.hasOwnProperty("action"))
{
	console.log("===Received a message from letsclap");
	var senderId=req.body.user_id;
	console.log("===letsclap user_id=",senderId);
	updateUserStatus(senderId,1);
	return fb.reply(fb.textMessage("So you are back with Babun Bot. Say HELLO to get started."),senderId);
}
else
{
	console.log("===Received a message from FB");
	dashbot.logIncoming(req.body);
	
    // get all the entries
    var entries = req.body.entry;
    var promises = [];
    entries.forEach(function(entry){
       var messages = entry.messaging;
       // get all the messages
       messages.forEach(function(message){
           //console.log("===message",message);
           var senderId = message.sender.id;

		
			
           // check if it is a text message
           var isTextMessage = Object.keys(message).indexOf("message") != -1;
           var isPostback = Object.keys(message).indexOf("postback") != -1;
           if( isTextMessage ){
			   var msg_id=message.message.mid;
               var text = message.message.text;
               console.log("===text message",text);
	//notifyincoming(message,senderId);
               // in case of text messages
               // we send the text to API.ai for NLP
               // however, we check for some special messages that don't need NLP
               // like thumbs and hearts, etc.
               var index = emojis.indexOf( text );
               if( index != -1 ){
                   console.log("===user sent emoji");
                   fb.reply( fb.textMessage(emojis[index]), senderId );
               }else{
                   // NLP!
                   console.log("===user sent text");
                   promises.push( nlp(text,senderId,msg_id) );
				  
               }
           }else if(isPostback){
               console.log("===user sent postback");
               handlePostback(message.postback.payload,senderId);
           }else{
               // else, just send a thumb
               fb.reply( fb.textMessage("(y)"), senderId);
           }// END IF FOR isTextMessage
       });
    });
    Q.all(promises).then(function(results){
        results.forEach(function(result){
			checkControlOfChat(result);
			
           //afterNlp(result);
        });
    },function(error){
        console.log("[webhook_post.js]",error);
    });
    return next();

}

}
//------------------------------------------------------------------------------

function notifyincoming(message,senderId)
{
	 // Build the post string from an object
	  console.log("===dashbot in");
	   var options = {
		uri: 'https://tracker.dashbot.io/track?platform=facebook&v=0.6.0&type=incoming&apiKey=v32QmG1446nC9QpYWV13hbgrd8F2HEQTc3sivlw2',
        method: 'POST',
        json : {
            recipient: {
                id : senderId
            },
            message : message
        }
		};

		request(options, function (error, response, body) {
		  if (!error && response.statusCode == 200) {
			console.log("===dashbot response success") // Print the shortened url.
			

		  }
		  else{
			console.log("===dashbot response failure",body);
			//console.log("===dashbot response error",error);
			//console.log("===dashbot response response",response);
		  }
		});
}

function notifyout(message,senderId)
{
	 // Build the post string from an object
	  console.log("===dashbot out");
	   var options = {
		uri: 'https://tracker.dashbot.io/track?platform=facebook&v=0.6.0&type=outgoing&apiKey=v32QmG1446nC9QpYWV13hbgrd8F2HEQTc3sivlw2',
        method: 'POST',
        json : {
            recipient: {
                id : senderId
            },
            message : message
        }
		};

		request(options, function (error, response, body) {
		  if (!error && response.statusCode == 200) {
			console.log("===dashbot response success") // Print the shortened url.
			

		  }
		  else{
			console.log("===dashbot response failure",body);
			//console.log("===dashbot response error",error);
			//console.log("===dashbot response response",response);
		  }
		});
}

function afterNlp(data){


   var action = data.result.action;

    console.log("===action",action);
    if( data.result.source == "agent" ){
        switch( action ){
			case "agent.exitto.letsclap":
                PostCode(data);
                break;
			case "agent.hello.babun":
                hello(data);
                break;
            case "agent.about":
                about(data);
                break;
            case "agent.help":
                help(data);
                break;
            case "agent.bananas":
                bananas(data);
                break;
            case "agent.age":
                age(data);
                break;
            case "agent.joke":
                joke(data);
                break;
			case "agent.submit.tool":
                submitTool(data);
                break;
			case "agent.development.tool":
                developmentTool(data);
                break;
            case "agent.list.productivity.tools":
                listProductivityTools(data);
                break;
            case "agent.list.marketing.tools":
                listMarketingTools(data);
                break;
            case "agent.recommend.productivity.tools":
                recommendProductivityTools(data);
                break;
            case "agent.recommend.marketing.tools":
                console.log("marketing tools");
                recommendMarketingTools(data);
                break;
            case "agent.find.me.a.tool":
                findMeATool(data);
                break;
            case "agent.name.get":
                name(data);
                break;
            case "agent.gender.get":
                gender(data);
                break;
			case "agent.thanks":
                thanks(data);
                break;
            default:
                dontKnow(data);
        }
    }else if( data.result.source == "domains" ){
        console.log("===domains");
        // API.ai converts all our complex queries into
        // a simplified, canonical form.
        // We check this to decide our responses
        if( action == "input.unknown" || action == "wisdom.unknown" ){
            dontKnow(data);
        }else{
            var simplified = data.result.parameters.simplified;
            console.log("===simplified",simplified);
            switch( simplified ){
                case "how are you":
                    howAreYou(data);
                    break;
                case "hello":
                    hello(data);
                    break;
                case "goodbye":
                    bye(data);
                    break;
                case "good morning":
                    goodMorning(data);
                    break;
                case "good night":
                    goodNight(data);
                    break;
                case "thank you":
                    thanks(data);
                    break;
                case "what is up":
                    watup(data);
                    break;
                default:
                    console.log("===domains unknown/rejected action");
                    dontKnow(data);
            }
        }
    }else{
        dontKnow(data);
    }
}
//------------------------------------------------------------------------------

//post to letsclap
function PostCode(data) {
console.log("==letsclap data",data);
//check if the action is called first time or second
var senderId = data.sessionId;
var msg_id = data.msg_id;
var contexts=findContextsWithLifespan(data.result.contexts)
if (contexts != undefined && contexts.length != 0) {
   console.log("===do you want to escape to human?");
   
	//return fb.reply(fb.textMessage("Sorry! I did not understand that. Do you want to talk with Human? Please say Yes or No."),senderId);
	return db.getMessagesOfType("escapeto_human").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
else{

 var choice=data.result.parameters.choice;
 if(choice.toString().trim()=="yes"){

	  // Build the post string from an object
	  console.log("===location 2");
	  
	  var post_data = {"action":"takeover","user_id" : senderId,"msg_id" : msg_id};

	  console.log("==letsclap post data",post_data);

		  var options = {
		  uri: 'https://app.letsclap.io/letsclap/takeover/85a6c77062ec6ccf099f7f05af96457e',
		  method: 'POST',
		  json: post_data
		};

		request(options, function (error, response, body) {
		  if (!error && response.statusCode == 200) {
			console.log("===letsclap response success") // Print the shortened url.
			//console.log("===letscla response ",response);

		  }
		});
		updateUserStatus(senderId,0);
		return fb.reply(fb.textMessage("Please wait while I connect you with a real agent."),senderId);
		}
	

	else{
		var text="So you decided to continue with BabunBot. Here is what I can help you with.";
		var button1=fb.createButton("Find a Tool","tools");
		//var button2=fb.createButton("Service providers","services");
		
		var button3=fb.createButton("Submit your product","devtool");
		//var button3=fb.createButton("Find a Tool","tools");
		var message={
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"button",
					"text":text,
					"buttons":[button1,button3]
							}
						}
					};
		return fb.reply(message,senderId);
	}
 }
}

function checkControlOfChat(data){
	return db.getBotUser(data.sessionId).then(function(rows){
		if (rows.length>0)
		{
		  if(rows[0].is_botactive==0){console.log("===control lies with letsclap");}

		  else{
			console.log("===control lies with bot");
			afterNlp(data);
		  }

		}
		else
		{

			console.log("===inserting a new row to the bot_users");
			var new_user=insertNewBotUser(data.sessionId);
			afterNlp(data);

		}

	},function(error){
		console.log("[webhook_post.js]",error);
	});
}

function insertNewBotUser(senderId){
	return db.insertBotUser(senderId).then(function(result){
		return result;

	},function(error){
		console.log("[webhook_post.js]",error);
	});

}

function updateUserStatus(senderId,is_botactive){
	return db.updateUserStatus(senderId,is_botactive).then(function(result){
		return result;

	},function(error){
		console.log("[webhook_post.js]",error);
	});

}

function handlePostback(payload,senderId){
    console.log("===postback",payload);
    console.log("===senderId",senderId);

	if(payload.toString().trim()==="hello")
	{
		var promises = [];
	     var msg_id="1234";
		 var text="hello";
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});
	}
	
	else if(payload.toString().trim()==="devtool")
	{
		var promises = [];
	     var msg_id="1234";
		 var text="submit tool";
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});
	}

	else if(payload.toString().trim()==="services")
	{
		var promises = [];
	     var msg_id="1234";
		 var text="add development tool";
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});
	}
	else if(payload.toString().trim()==="tools")
	{

		return db.getMessagesOfType("tools").then(function(messages){
			var message = oneOf(messages);
			var text = message.text;

			var button1=fb.createButton("Productivity Tools","productivity");
			var button2=fb.createButton("Marketing Tools","marketing");
			var message={
				"attachment":{
					"type":"template",
					"payload":{
						"template_type":"button",
						"text":text,
						"buttons":[button1,button2]
								}
							}
						};
			return fb.reply(message,senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});

	}

	else if(payload.toString().trim()==="productivity")
	{
		 var promises = [];
	     var msg_id="1234";
		 var text="productivity tools";
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});

	}
	else if(payload.toString().trim()==="marketing")
	{
		 var promises = [];
	     var msg_id="1234";
		 var text="marketing tools";
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});

	}

	else if(payload.toString().trim()==="talktoexpert")
	{
		var promises = [];
	     var msg_id="1234";
		 var text="exit to letsclap";
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});
	}

	/* else if(payload.toString().trim()==="prodlist")
	{
		var promises = [];
	     var msg_id="1234";
		 var text=payload.substr(8,end);
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});
	}
 */
	
	
    else if( /excerpt \d+/i.test(payload) ){
        var id = payload.match(/excerpt (\d+)/)[1];
        console.log("===excerpt for",id);
        return db.getExcerptFor(id).then(function(excerpts){
            var excerpt = "Babun find out later, k?";
            if(excerpts.length !=0){
                console.log("===excerpts",excerpts);
                excerpt = excerpts[0].excerpt ? excerpts[0].excerpt : excerpt;
            }
            console.log("===excerpt is",excerpt);
            return fb.reply( fb.textMessage(excerpt), senderId);
        },function(error){
            console.log("[webhook_post.js]",error);
        })
    }
}
//------------------------------------------------------------------------------
function about(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("about").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}

//------------------------------------------------------------------------------
function developmentTool(data){
	console.log("===context name",data.result.contexts[0].name);
	var senderId = data.sessionId;

	var contexts=findContextsWithLifespan(data.result.contexts)
	if (contexts != undefined && contexts.length != 0) {
    //ask form questions one by one
	console.log("===context length",contexts.length);

		var context=contexts.pop();
		var context_name=context.name;
		//enter a tool name
		if(context_name.toString().trim()==="development-tool")
		{
			return db.getMessagesOfType("service_name").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
		}
		//enter email of the product
		else if (context_name.toString().trim()==="dev-toolname")
		{
			return db.getMessagesOfType("service_email").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
		}

		//enter advance stage of the product
		else if (context_name.toString().trim()==="dev-toolemail")
		{
			return db.getMessagesOfType("service_advance").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
		}
		//enter platform for the product
		else if (context_name.toString().trim()==="dev-tooladvance")
		{

			return db.getMessagesOfType("service_platform").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});	
		}	
		//enter deadline for product
		else if (context_name.toString().trim()==="dev-toolplatform")
		{

			return db.getMessagesOfType("service_deadline").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});	
		}	
		//enter budget for product
		else if (context_name.toString().trim()==="dev-tooldeadline")
		{

			return db.getMessagesOfType("service_budget").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});	
		}	
		//enter description for product
		else if (context_name.toString().trim()==="dev-toolbudget")
		{

			return db.getMessagesOfType("service_description").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});	
		}	
	}
	else
	{
	//save the params value in db
		var devtoolname=data.result.parameters.devtoolname;
		var devtoolemail=data.result.parameters.devtoolemail;
		var devtooladvance=data.result.parameters.devtooladvance;
		var devtoolplatform=data.result.parameters.devtoolplatform;
		var devtooldeadline=data.result.parameters.devtooldeadline;
		var devtoolbudget=data.result.parameters.devtoolbudget;
		var devtooldesc=data.result.parameters.devtooldesc;

		console.log("devtoolname: ",devtoolname);
		console.log("devtoolemail: ",devtoolemail);
		console.log("devtooladvance: ",devtooladvance);
		console.log("devtoolplatform: ",devtoolplatform);
		console.log("devtooldeadline: ",devtooldeadline);
		console.log("devtoolbudget: ",devtoolbudget);
		console.log("devtooldesc: ",devtooldesc);



		return db.insertToolToDevelopment(devtoolname,devtoolemail,devtooladvance,devtoolplatform,devtooldeadline,devtoolbudget,devtooldesc).then(function(result){   
            console.log("===insertion result is",result);
            //return fb.reply( fb.textMessage("Congratulations!! Your service request is submitted. We will get back to you soon."), senderId);
			return db.getMessagesOfType("service_end").then(function(messages){
			var message = oneOf(messages);
			var text = message.text;

		var button1=fb.createButton("Find a Tool","tools");
		//var button2=fb.createButton("Service providers","services");
		var button3=fb.createButton("Submit your product","devtool");
		var message={
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"button",
					"text":text,
					"buttons":[button1,button3]
							}
						}
					};
			return fb.reply(message,senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
        },function(error){
            console.log("[webhook_post.js]",error);
        })
	}

}

//------------------------------------------------------------------------------
function submitTool(data){
	console.log("===context name",data.result.contexts[0].name);
	var senderId = data.sessionId;
	//var context_name=data.result.contexts[0].name;
	//var context_lifespan=data.result.contexts[0].lifespan;

	var contexts=findContextsWithLifespan(data.result.contexts)
	if (contexts != undefined && contexts.length != 0) {
    //ask form questions one by one
	console.log("===context length",contexts.length);

		var context=contexts.pop();
		var context_name=context.name;
		//enter a tool name
		if(context_name.toString().trim()==="submit-tool")
		{
			return db.getMessagesOfType("form_product_name").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
		}
		//enter website of the product
		else if (context_name.toString().trim()==="submit-toolname")
		{
			return db.getMessagesOfType("form_product_web").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
		}

		//enter description of the product
		else if (context_name.toString().trim()==="submit-toolweb")
		{
			return db.getMessagesOfType("form_product_desc").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
		}
		//enter email for the product
		else if (context_name.toString().trim()==="submit-tooldesc")
		{

			return db.getMessagesOfType("form_product_email").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});	
		}	
	}
	else
	{
	//save the params value in db
		var toolname=data.result.parameters.toolname;
		var website=data.result.parameters.website;
		var description=data.result.parameters.description;
		var email=data.result.parameters.toolemail;
		console.log("tool-name",toolname);
		console.log("website",website);
		console.log("description",description);
		console.log("email",email);


		return db.insertToolTo(toolname,website,description,email).then(function(result){   
            console.log("===insertion result is",result);
            //return fb.reply( fb.textMessage("Congratulations!! Your tool has been submitted."), senderId);

		return db.getMessagesOfType("form_product_end").then(function(messages){
			var message = oneOf(messages);
			var text = message.text;

		var button1=fb.createButton("Find a Tool","tools");
		//var button2=fb.createButton("Service providers","services");
		var button3=fb.createButton("Submit your product","devtool");
		var message={
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"button",
					"text":text,
					"buttons":[button1,button3]
							}
						}
					};
			return fb.reply(message,senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
        },function(error){
            console.log("[webhook_post.js]",error);
        })


	}

}
//------------------------------------------------------------------------------
function help(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("help").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;

		var button1=fb.createButton("Find a Tool","tools");
		//var button2=fb.createButton("Service providers","services");
		
		var button3=fb.createButton("Submit your product","devtool");
		//var button3=fb.createButton("Find a Tool","tools");
		var message={
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"button",
					"text":text,
					"buttons":[button1,button3]
							}
						}
					};
		return fb.reply(message,senderId);
        //return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function bananas(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("bananas").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function age(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("age").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function joke(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("joke").then(function(messages){
        var message = oneOf(messages);
        // a joke may be a text or an image
        // so we need to check the properties
        var isImage = message.image;
        if( isImage ){
            var url = message.image;
            return fb.reply( fb.imageMessage(url),senderId );
        }else{
            var text = message.text;
            return fb.reply( fb.textMessage(text),senderId );
        }
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function howAreYou(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("how_are_you").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function dontKnow(data){
    var senderId = data.sessionId;

        var promises = [];
	    var msg_id = data.msg_id;
		 var text="connect me with real person";
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});
}
//------------------------------------------------------------------------------
function hello(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("hello").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
		
		var button1=fb.createButton("Find a Tool","tools");
//-----service providers corresponds to development tool on babun site---------------------
		//var button2=fb.createButton("Service providers","services");
//-----submit your product corresponds to Submit a tool on babun site---------------------
		var button3=fb.createButton("Submit your product","devtool");
		
		var message={
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"button",
					"text":text,
					"buttons":[button1,button3]
							}
						}
					};
					
		//fb.notifyout(message,senderId);
		return fb.reply(message,senderId);
		

        //return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function bye(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("bye").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function goodMorning(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("good_morning").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function goodNight(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("good_night").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function listProductivityTools(data){
    console.log("===listing productivity subcategories");
    const MAX_PAGE_NO = 3; // page numbers begin at 0
    var senderId = data.sessionId;
    var regex = /list_productivity_tools/i;
    var contexts = findContextsThatMatches(data.result.contexts,regex);
    var context = contexts.pop();
	console.log("===context lifespan", context.lifespan);
    var page = MAX_PAGE_NO - context.lifespan;

	
	return db.getMessagesOfType("productivity_tools").then(function(messages){
        console.log("===page number",page);
        var text = "Click on a category to find tools. Type 'more' for more categories";
		
		var item=findItemWithPageNumber(messages,page);
		if(page==3)
		{
			text="That will be all. Click on a category to find tools.";
		}
		var list_tools=item.text.split("\n");
		console.log("==split tools",list_tools);
		var message={
			"text":text,
			"quick_replies":[
			  {
				"content_type":"text",
				"title":list_tools[0].substr(list_tools[0].indexOf('.')+1),
				"payload":"prodlist"+list_tools[0].substr(0, list_tools[0].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[1].substr(list_tools[1].indexOf('.')+1),
				"payload":"prodlist"+list_tools[1].substr(0, list_tools[1].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[2].substr(list_tools[2].indexOf('.')+1),
				"payload":"prodlist"+list_tools[2].substr(0, list_tools[2].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[3].substr(list_tools[3].indexOf('.')+1),
				"payload":"prodlist"+list_tools[3].substr(0, list_tools[3].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[4].substr(list_tools[4].indexOf('.')+1),
				"payload":"prodlist"+list_tools[4].substr(0, list_tools[4].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[5].substr(list_tools[5].indexOf('.')+1),
				"payload":"prodlist"+list_tools[5].substr(0, list_tools[5].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[6].substr(list_tools[6].indexOf('.')+1),
				"payload":"prodlist"+list_tools[6].substr(0, list_tools[6].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[7].substr(list_tools[7].indexOf('.')+1),
				"payload":"prodlist"+list_tools[7].substr(0, list_tools[7].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[8].substr(list_tools[8].indexOf('.')+1),
				"payload":"prodlist"+list_tools[8].substr(0, list_tools[8].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[9].substr(list_tools[9].indexOf('.')+1),
				"payload":"prodlist"+list_tools[9].substr(0, list_tools[9].indexOf('.'))
			  }
			]
				};
		return fb.reply(message,senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    }); 
	 
	
    /* return db.getMessagesOfType("productivity_tools").then(function(messages){
        console.log("===page number",page);
        var message = findItemWithPageNumber(messages,page);
        console.log("===chosen message", message);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    }); */
}
//------------------------------------------------------------------------------
function listMarketingTools(data){
    console.log("===listing productivity subcategories");
    const MAX_PAGE_NO = 5; // page numbers begin at 0
    var senderId = data.sessionId;
    var regex = /list_marketing_tool/i;
    var contexts = findContextsThatMatches(data.result.contexts,regex);
    var context = contexts.pop();
    var page = MAX_PAGE_NO - context.lifespan;

	return db.getMessagesOfType("marketing_tools").then(function(messages){
        console.log("===page number",page);
        var text = "Click on a category to find tools. Type 'more' for more categories";
		
		var item=findItemWithPageNumber(messages,page);
		if(page==5)
		{
			text="That will be all. Click on a category to find tools.";
		}
		var list_tools=item.text.split("\n");
		console.log("==split tools",list_tools);
		var message={
			"text":text,
			"quick_replies":[
			  {
				"content_type":"text",
				"title":list_tools[0].substr(list_tools[0].indexOf('.')+1),
				"payload":"marklist"+list_tools[0].substr(0, list_tools[0].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[1].substr(list_tools[1].indexOf('.')+1),
				"payload":"marklist"+list_tools[1].substr(0, list_tools[1].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[2].substr(list_tools[2].indexOf('.')+1),
				"payload":"marklist"+list_tools[2].substr(0, list_tools[2].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[3].substr(list_tools[3].indexOf('.')+1),
				"payload":"marklist"+list_tools[3].substr(0, list_tools[3].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[4].substr(list_tools[4].indexOf('.')+1),
				"payload":"marklist"+list_tools[4].substr(0, list_tools[4].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[5].substr(list_tools[5].indexOf('.')+1),
				"payload":"marklist"+list_tools[5].substr(0, list_tools[5].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[6].substr(list_tools[6].indexOf('.')+1),
				"payload":"marklist"+list_tools[6].substr(0, list_tools[6].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[7].substr(list_tools[7].indexOf('.')+1),
				"payload":"marklist"+list_tools[7].substr(0, list_tools[7].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[8].substr(list_tools[8].indexOf('.')+1),
				"payload":"marklist"+list_tools[8].substr(0, list_tools[8].indexOf('.'))
			  },
			  {
				"content_type":"text",
				"title":list_tools[9].substr(list_tools[9].indexOf('.')+1),
				"payload":"marklist"+list_tools[9].substr(0, list_tools[9].indexOf('.'))
			  }
			]
				};
		return fb.reply(message,senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    }); 
    /* return db.getMessagesOfType("marketing_tools").then(function(messages){
        console.log("===page number",page);
        var message = findItemWithPageNumber(messages,page);
        console.log("===chosen message", message);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    }); */
}
//------------------------------------------------------------------------------
function recommendProductivityTools(data){
    var senderId = data.sessionId;
    var subcat = data.result.parameters.productivity_tool;
    var elements = [];
    var rows;
    return db.getItemsForSubcategory(subcat).then(function(rowss){
        rows = rowss; // save a copy
		
		console.log("===rows",rows);
        var promises = [];
        // Get all icons
        for(var i = 0; i < rows.length; i++){
            promises.push( db.getIconFor(rows[i].id) );
        }
        return Q.all( promises );
    }).then(function(result){
        for(var i = 0; i < result.length; i++){
            var image_url = result[i].valueOf();
            var row = rows[i];
            console.log("===image for %s is %s",rows[i].id,image_url);
            var button = fb.createButton("Tell Me More","excerpt "+row.id);
            var excerpt = row.excerpt || "Babun no have description :( Babun later learn, k?";
			
            var element = fb.createElement(row.title,excerpt,image_url,[button]);
            elements.push(element);
        }
        return fb.reply(fb.carouselMessage(elements),senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------

function recommendMarketingTools(data){
    var senderId = data.sessionId;
    var subcat = data.result.parameters.marketing_tool;
    var elements = [];
    var rows;
    return db.getItemsForSubcategory(subcat).then(function(rowss){
        rows = rowss; // save a copy
		
		console.log("===rows",rows);
        var promises = [];
        // Get all icons
        for(var i = 0; i < rows.length; i++){
            promises.push( db.getIconFor(rows[i].id) );
        }
        return Q.all( promises );
    }).then(function(result){
        for(var i = 0; i < result.length; i++){
            var image_url = result[i].valueOf();
            var row = rows[i];
            console.log("===image for %s is %s",rows[i].id,image_url);
            var button = fb.createButton("Tell Me More","excerpt "+row.id);
            var excerpt = row.excerpt || "Babun no have description :( Babun later learn, k?";
			
            var element = fb.createElement(row.title,excerpt,image_url,[button]);
            elements.push(element);
        }
        return fb.reply(fb.carouselMessage(elements),senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}

/* function recommendMarketingTools(data){
    var senderId = data.sessionId;
    var subcat = data.result.parameters.marketing_tool;
    return db.getItemsForSubcategory(subcat).then(function(rows){
        var elements = [];
        for(var i = 0; i < rows.length; i++){
            var row = rows[i];
            var button = fb.createButton("Tell Me More","excerpt "+row.id);
            var excerpt = row.excerpt || "Babun no have description :( Babun later learn, k?";
            var element = fb.createElement(row.title,excerpt,row.image,[button]);
            elements.push(element);
        }
        return fb.reply(fb.carouselMessage(elements),senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
} */
//------------------------------------------------------------------------------
function findMeATool(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("find_me_tools").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function name(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("name").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function thanks(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("thanks").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function watup(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("what_up").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
function gender(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("gender").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function oneOf(array){
    if(array instanceof  Array){
        var index = randomIndex(array);
        return array[ index ];
    }
}
//------------------------------------------------------------------------------
function findContextsThatMatches(contexts,regex){
    var matchingContexts = [];
    contexts.forEach(function(context){
       var name = context.name;
       if( regex.test(name) ){
           matchingContexts.push(context);
           console.log(name,"matches regex");
       }
    });
    return matchingContexts;
}

function findContextsWithLifespan(contexts){
    var matchingContexts = [];
    contexts.forEach(function(context){
       var lifespan = context.lifespan;
       if(lifespan==1){
           matchingContexts.push(context);
       }
    });
    return matchingContexts;
}

//------------------------------------------------------------------------------
function findItemWithPageNumber(array,page){
    var item;
    for(var i = 0; i < array.length; i++){
        if( array[i].page == page){
            item = array[i];
            break;
        }
    }
    return item;
}
//------------------------------------------------------------------------------
function getquickbuttons(array,page){
    //var message;
	var item;
    for(var i = 0; i < array.length; i++){
        if( array[i].page == page){
            item = array[i].split("\n");
			console.log("==item after slpit",item);
            break;
        }
    }
	
    return item;
}

//------------------------------------------------------------------------------
function randomIndex(array){
    return Math.floor(Math.random()*array.length);
}
//------------------------------------------------------------------------------