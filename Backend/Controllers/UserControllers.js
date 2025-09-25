/*const User=require("../Model/UserModel");
//data dispaly
const getAllUsers=async(req,res,next)=>{
    let users;
//get all users
    try{
        users=await User.find();

    }catch(err)
{
    console.log(err);
}
//not found
if(!users){
    return res.status(404).json({message:"user not found"});
}
//display all users
return res.status(200).json({users});


};
//data insert
const addUsers=async(req,res,next)=>{
    const {name,gmail,age,address}=req.body;

    let users;
    try{
        users=new User({name,gmail,age,address});
        await users.save();

        

    }catch(err){
        console.log(err);
        
    }
    //not inserted users
    if(!users){
        return res.status(404).send({message:"unable to add users"});

    }
    return res.status(200).json({users});



}

exports.getAllUsers=getAllUsers;
exports.addUsers=addUsers;*/


const User = require("../Model/UserModel");
const mongoose = require("mongoose");

// get all users
const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        
        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }

        return res.status(200).json({ users });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

// add new user
const addUsers = async (req, res, next) => {
    const { name, gmail, age, address } = req.body;

    try {
        const user = new User({ name, gmail, age, address });
        await user.save();

        return res.status(201).json({
            message: "User created successfully",
            user
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Unable to add user", error: err.message });
    }
};

// get by id
const getById = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Check if the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ user });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Debug route to get all user IDs
const getAllUserIds = async (req, res, next) => {
    try {
        const users = await User.find().select('_id name');
        return res.status(200).json({ users });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

//update user details
const updateUser =async(req,res,next)=>{
     const id = req.params.id;
     const { name, gmail, age, address } = req.body;
     let users;
     try{
        users=await User.findByIdAndUpdate(id,
            {name:name,gmail:gmail,age:age,address:address});
            users= await users.save();


     }catch(err){
        console.log(err);
     }
      if (!users) {
            return res.status(404).json({ message: "Unable to update user details" });
        }

        return res.status(200).json({ users });
};

//delete user function
const deleteUser =async(req,res,next)=>{
    const id = req.params.id;
    let user;

    try{
        user=await User.findByIdAndDelete(id);
    }catch(err){
        console.log(err);
    }
    if (!user) {
            return res.status(404).json({ message: "Unable to delete user details" });
        }

        return res.status(200).json({ user });

};


// Export all controller functions
exports.getAllUsers = getAllUsers;
exports.addUsers = addUsers;
exports.getById = getById;
exports.getAllUserIds = getAllUserIds;
exports.updateUser=updateUser;
exports.deleteUser=deleteUser;