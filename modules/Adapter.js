// READ!!! http://taoofcode.net/promise-anti-patterns/
// READ!!! http://raganwald.com/2014/07/09/javascript-constructor-problem.html
// READ!!! https://www.firebase.com/docs/web/guide/
// READ!!! https://www.firebase.com/blog/2016-01-21-keeping-our-promises.html
// READ!!! http://stackoverflow.com/questions/17015590/node-js-mysql-needing-persistent-connection
var Firebase = require("firebase");
var mysql = require("mysql");
var Q = require("q");
var options = {
    "host" : process.env.MYSQL_HOST,
    "port" : process.env.MYSQL_PORT,
    "user" : process.env.MYSQL_USER,
    "password" : process.env.MYSQL_PASSWORD,
    "database" : process.env.MYSQL_DATABASE
};

function Adapter(){
    if(this instanceof  Adapter){
        this.root = new Firebase( process.env.FIREBASE_URL );
        this.db = mysql.createPool(options);    
    }else{
        return new Adapter();
    }
}
//------------------------------------------------------------------------------
Adapter.prototype.getMessagesOfType = function(type){
    var query = this.root.child("messages").child(type);
    return query.once("value").then(function(snapshot){
        return snapshot.val();
    },function(err){
        console.log("[Adapter.js getmessageOfType]",error);
    });
}
//------------------------------------------------------------------------------
Adapter.prototype.getItemsForSubcategory = function(subcat) {
    subcat = "%" + subcat + "%";
    const query = "SELECT p.ID AS id, p.post_title AS title, " +
                  "p.post_excerpt AS excerpt FROM bn_term_relationships r " +
                  "INNER JOIN bn_posts p ON p.ID = r.object_id " +
                  "INNER JOIN bn_terms t ON t.term_id = r.term_taxonomy_id " +
                  "WHERE LOWER(t.name) LIKE @subcat AND post_status='publish' " +
                  "ORDER BY RAND()" +
                  "LIMIT 10 ";
    var newQuery = query.replace("@subcat",this.db.escape(subcat));
    var deferred = Q.defer();
    this.db.getConnection(function(err,connection){
        if(err){
            deferred.reject(err);
        }else{
            connection.query(newQuery,[],function(err,results){
                connection.release();
                if(err){
                    deferred.reject(err);
                }else{
                    deferred.resolve(results);
                }
            });
        }
    });
    return deferred.promise;
};
//------------------------------------------------------------------------------
Adapter.prototype.getIconFor = function(id) {
    const path = "http://www.babun.io/wp-content/uploads/";

    const query = "SELECT meta_value as path " + 
                  "FROM bn_postmeta " + 
                  "WHERE post_id in " +
                    "(SELECT meta_value FROM bn_postmeta WHERE post_id=@id AND meta_key='app_icon') " +  
                  "AND meta_key='_wp_attached_file'";
    var newQuery = query.replace("@id",id);
    var deferred = Q.defer();
    this.db.getConnection(function(err,connection){
        if(err){
            deferred.reject(err);
        }else{
            connection.query(newQuery,[],function(err,results){
                connection.release();
                if(err){
                    deferred.reject(err);
                }else{
                    if(!results || results.length == 0 ){
                        return "http://www.babun.io/wp-content/uploads/2016/03/BabunMetaPic-1.png"
                    }else{
                        deferred.resolve(path + results[0].path);
                    }
                }
            });
        }
    });
    return deferred.promise;
};
//------------------------------------------------------------------------------
Adapter.prototype.getExcerptFor = function(id){
    const query = "SELECT post_excerpt as excerpt " +
                  "FROM bn_posts " +
                  "WHERE ID = " + this.db.escape(id);
    var deferred = Q.defer();
    this.db.getConnection(function(err,connection){
        if(err){
            deferred.reject(err);
        }else{
            connection.query(query,[],function(err,results){
                connection.release();
                if(err){
                    deferred.reject(err);
                }else{
                    deferred.resolve(results);
                }
            });
        }
    });
    return deferred.promise;
}
//------------------------------------------------------------------------------
module.exports = Adapter;