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
//------------------------------------------------------------------------------
module.exports = function(req,res,next){
    // Tell FB that we have received the request by ending it.
    // Without this, the request will timeout and FB will resend it
    // causing you to accidentally spam the user.
    console.log("===Received a message from FB");
    res.end();
    // get all the entries
    var entries = req.body.entry;
    var promises = [];
    entries.forEach(function(entry){
       var messages = entry.messaging;
       // get all the messages
       messages.forEach(function(message){
           //console.log("===message",message);
           var senderId = message.sender.id;
		   
		   
		   //check if bot or letsclap has the control
		   
		   
		   
           // check if it is a text message
           var isTextMessage = Object.keys(message).indexOf("message") != -1;
           var isPostback = Object.keys(message).indexOf("postback") != -1;
           if( isTextMessage ){
			   var msg_id=message.message.mid;
               var text = message.message.text;
               console.log("===text message",text);
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
           afterNlp(result);
        });
    },function(error){
        console.log("[webhook_post.js]",error);
    });
    return next();
}
//------------------------------------------------------------------------------
function afterNlp(data){
    var action = data.result.action;
    console.log("===amit-data",data);

    console.log("===action",action);
    if( data.result.source == "agent" ){
        switch( action ){
			case "agent.exitto.letsclap":
                PostCode(data);
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
  // Build the post string from an object
  var senderId = data.sessionId;
  var msg_id = data.msg_id;
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
  }
});

}



function handlePostback(payload,senderId){
    console.log("===postback",payload);
    console.log("===senderId",senderId);

	if(payload.toString().trim()==="services")
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
function submitTool(data){
	console.log("===context name",data.result.contexts[0].name);
	var senderId = data.sessionId;
	//var context_name=data.result.contexts[0].name;
	//var context_lifespan=data.result.contexts[0].lifespan;
	
	var contexts=findContextsWithLifespan(data.result.contexts)
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
	else if (context_name.toString().trim()==="submit-tooldescription")
	{
		if(context_lifespan===1)
		{
			return db.getMessagesOfType("form_product_email").then(function(messages){
				var message = oneOf(messages);
				var text = message.text;
				return fb.reply( fb.textMessage(text), senderId);
			},function(error){
				console.log("[webhook_post.js]",error);
			});
		}
		//save the params value in db
		else{
		
			return fb.reply( fb.textMessage("Your tool has been submitted"), senderId);
		}
	}
	
}
//------------------------------------------------------------------------------
function help(data){
    var senderId = data.sessionId;
    return db.getMessagesOfType("help").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
		
		var button1=fb.createButton("Services","services");
		var button2=fb.createButton("Tools","tools");
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
    return db.getMessagesOfType("unknown").then(function(messages){
        var message = oneOf(messages);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
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
		
		var button1=fb.createButton("Services","services");
		var button2=fb.createButton("Tools","tools");
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
        var message = findItemWithPageNumber(messages,page);
        console.log("===chosen message", message);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
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
        var message = findItemWithPageNumber(messages,page);
        console.log("===chosen message", message);
        var text = message.text;
        return fb.reply( fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}
//------------------------------------------------------------------------------
function recommendProductivityTools(data){
    var senderId = data.sessionId;
    var subcat = data.result.parameters.productivity_tool;
    var elements = [];
    var rows
    return db.getItemsForSubcategory(subcat).then(function(rowss){
        rows = rowss; // save a copy
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
}
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
function randomIndex(array){
    return Math.floor(Math.random()*array.length);
}
//------------------------------------------------------------------------------