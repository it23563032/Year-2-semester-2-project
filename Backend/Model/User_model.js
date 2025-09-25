const mongoose =require("mongoose");
const Schema=mongoose.Schema;

const userSchema=new Schema({
    name:{
        type:String,//daatatyep
        required:true,//validate
    }, 
    gmail:{
        type:String,//daatatyep
        required:true,//validate
    },
    age:{
        type:Number,//daatatyep
        required:true,//validate
    },
    address:{
        type:String,//daatatyep
        required:true,//validate
    }
    
});

// Check if model already exists to prevent OverwriteModelError
module.exports = mongoose.models.UserModel || mongoose.model(
    "UserModel",//filename
    userSchema//function name
)