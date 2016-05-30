var request = require("request");
var Q = require("q");
//--------------------------------------------------------------------------------
function textMessage(message){
    return {
        "text" : message
    }
}
//--------------------------------------------------------------------------------


function imageMessage(url){
    return {
        "attachment" :{
            "type":"image",
                "payload":{
                "url": url
            }
        }
    }
}

function buttonTextMessage(buttons,text){
    return {
        "attachment" : {
            "type" : "template",
            "payload" : {
                "template_type" : "button",
				"text":text,
                "buttons" : buttons
            }
        }
    }
}

//--------------------------------------------------------------------------------
function carouselMessage(elements){
    return {
        "attachment" : {
            "type" : "template",
            "payload" : {
                "template_type" : "generic",
                "elements" : elements
            }
        }
    }
}
//--------------------------------------------------------------------------------
function createElement(title,subtitle,image,buttons){
    return {
        "title" : title,
        "subtitle" : subtitle,
        "image_url" : (image || "http://www.babun.io/wp-content/uploads/2016/03/BabunMetaPic-1.png"),
        "buttons" : buttons
    }
}
//--------------------------------------------------------------------------------
function createButton(title,payload){
    return {
        "type" : "postback",
        "title" : title,
        "payload" : payload
    }
}
//--------------------------------------------------------------------------------
function reply(message,senderId){
    var deferred = Q.defer();
    console.log("===sending message to: ",senderId);
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token : process.env.PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json : {
            recipient: {
                id : senderId
            },
            message : message
        }
    },function(err,response,body) {
        if(err){
            console.log("===error while sending message to FB: ", err.message);
            deferred.reject(err);
        }else{
            if(response.statusCode == 200){
                console.log("===sent message to FB");
                deferred.resolve(body);
            }else{
                console.log("===error sending message",body);
                deferred.reject(body);
            }
        }
    });
    return deferred.promise;
}
//--------------------------------------------------------------------------------
exports.textMessage = textMessage;
exports.carouselMessage = carouselMessage;
exports.imageMessage = imageMessage;
exports.createElement = createElement;
exports.createButton = createButton;
exports.reply = reply;