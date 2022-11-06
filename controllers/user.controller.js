const db = require("../models");
const Post = db.post;
const User = db.user;
const moment = require("moment");

exports.allAccess = (req, res) => {
  res.status(200).send("Public Content.");
};

exports.userBoard = (req, res) => {
  console.log(req.userId);
  res.status(200).send("User Content.");
};

exports.insertPost = (req, res) => {
  console.log(req.userId);

  const insertpost = new Post({
    text: req.body.text,
    author: req.userId,
    post_time: moment().format(),
    visibility: req.body.visibility,
  });
  insertpost.save((err, insertpost) => {
    if (err) {
      res.status(500).json({ message: err });
      return;
    } else {
      res.json({ message: "Post successfully!" });
    }
  });
};

exports.home = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    console.log(req.query.page);
    const home = await Post.find({ visibility: "Public" })
      .sort({ post_time: -1 })
      .skip((req.query.page - 1) * 10)
      .limit(10)
      .lean();
    const postRes = [];
    for (let i = 0; i < home.length; i++) {
      const finduser = await User.findOne(
        { _id: home[i].author },
        { username: 1, images: 1, _id: 0 }
      ).lean();
      const merged = { ...home[i], ...finduser };
      postRes.push(merged);
    }
    console.log(postRes);
    const count = await Post.count({ visibility: "Public" });
    console.log(count);
    const totalPage = Math.ceil(count / 10);
    res.status(200).send({ totalPage, postRes });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.homefollow = async (req, res) => {
  try {
    console.log("This user is: " + req.userId);
    const finduserfollow = await User.findById(req.userId, {
      following: 1,
    }).lean();
    const arrayfollowing = finduserfollow.following;
    console.log("This user followed: " + arrayfollowing);
    console.log("This user followed : " + arrayfollowing.length + " users");
    const postRes = [];
    for (let i = 0; i < arrayfollowing.length; i++) {
      const findfollowuserprofile = await User.findById(arrayfollowing[i], {
        _id: 0,
        username: 1,
        images: 1,
      }).lean();
      const findfollowpost = await Post.find({
        author: arrayfollowing[i],
        $or: [{ visibility: "Public" }, { visibility: "Follow" }],
      }).lean();
      for (let i = 0; i < findfollowpost.length; i++) {
        const merged = { ...findfollowuserprofile, ...findfollowpost[i] };
        postRes.push(merged);
      }
    }
    console.log("postRes: " + postRes);
    const count = await Post.count({ visibility: "Follow" });
    console.log("count: " + count);
    const totalPage = Math.ceil(count / 10);
    res.status(200).send({ totalPage, postRes });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.profile = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    const profile = await User.findOne(
      { _id: req.userId },
      { _id: 1, username: 1, images: 1 }
    );
    res.status(200).send(profile);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.accountsetting = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    const setting = await User.updateOne(
      { _id: req.userId },
      {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        images: req.body.images,
      }
    );
    res.status(200).send(setting);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.editpost = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    const editpost = await Post.updateOne(
      { _id: req.body.postId },
      {
        text: req.body.text,
        images: req.body.images,
        edit_time: moment().format(),
        visibility: req.body.visibility,
      }
    );
    res.status(200).send(editpost);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.deletepost = async (req, res) => {
  try {
    console.log("This postId is " + req.postId);
    const deletepost = await Post.findOneAndDelete({ _id: req.body.postId });
    res.status(200).send("Delete post successfully");
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.follow = async (req, res) => {
  try {
    console.log(req.body);
    const findfollow = await User.findOne(
      { $and: [{ _id: req.body.profile_userID }, { follower: req.userId }] },
      { _id: 1, username: 1, follower: 1, following: 1 }
    );
    //return followed user
    console.log("This user is: " + req.userId);
    console.log("Trying to follow: " + req.body.profile_userID);
    if (findfollow == null) {
      const following = await User.findOneAndUpdate(
        { _id: req.userId },
        { $push: { following: req.body.profile_userID } }
      );
      const follower = await User.findOneAndUpdate(
        { _id: req.body.profile_userID },
        { $push: { follower: req.userId } }
      );
      res.status(200).send({ message: "Follow successfully!" });
      return;
    } else {
      res.status(400).send({ message: "You already followed this user!" });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.unfollow = async (req, res) => {
  try {
    console.log(req.body);
    const findfollow = await User.findOne(
      { $and: [{ _id: req.body.profile_userID }, { follower: req.userId }] },
      { _id: 1, username: 1, follower: 1, following: 1 }
    );
    //return other user
    console.log("This user is: " + req.userId);
    console.log("Other user is: " + req.body.profile_userID);

    if (findfollow == null) {
      res.status(400).send({ message: "You do not follow this user yet!" });
      return;
    } else {
      //A unfollow B => Delete A from B Follower, Delete B from A Following
      const deletefollowing = await User.updateOne(
        { _id: req.userId, following: req.body.profile_userID },
        { $pull: { following: req.body.profile_userID } }
      );
      const deletefollower = await User.updateOne(
        { _id: req.body.profile_userID, follower: req.userId },
        { $pull: { follower: req.userId } }
      );
      res.status(200).send({ message: "Unfollow successfully!" });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.getProfileContent = async (req, res) => {
  try {
    console.log(req.query.profile_userID);
    const TargetUser = await User.findById(req.query.profile_userID);
    console.log(TargetUser);
    if (!TargetUser) {
      res.status(404).send("User Not Found");
      return;
    }
    const visibility = TargetUser.follower.includes(req.userId)
      ? { $or: [{ visibility: "Public" }, { visibility: "Follow" }] }
      : { visibility: "Public" };
    const userPost = await Post.find({
      ...visibility,
      author: req.query.profile_userID,
    })
      .sort({ post_time: -1 })
      .skip((req.query.page - 1) * 10)
      .limit(10)
      .lean();
    const count = await Post.count({
      ...visibility,
      author: req.query.profile_userID,
    });
    const totalPage = Math.ceil(count / 10);
    const postRes = userPost.map((v) => ({
      ...v,
      username: TargetUser.username,
      profile_images: TargetUser.images,
    }));
    console.log(postRes);
    res.status(200).send({ totalPage, postRes });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.getSelfProfileContent = async (req, res) => {
  try {
    console.log(req.userId);
    const TargetUser = await User.findById(req.userId);
    console.log(TargetUser);
    if (!TargetUser) {
      res.status(404).send("User Not Found");
      return;
    }
    const userPost = await Post.find({ author: req.userId })
      .sort({ post_time: -1 })
      .skip((req.query.page - 1) * 10)
      .limit(10)
      .lean();
    const count = await Post.count({ author: req.userId });
    const totalPage = Math.ceil(count / 10);
    const postRes = userPost.map((v) => ({
      ...v,
      username: TargetUser.username,
      profile_images: TargetUser.images,
    }));
    console.log(postRes);
    res.status(200).send({ totalPage, postRes });
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.getProfileDetail = async (req, res) => {
  try {
    console.log(req.query.profile_userID);
    let TargetUser = await User.findById(req.query.profile_userID)
      .select({ _id: 1, username: 1, follower: 1, following: 1, images: 1 })
      .lean();
    console.log(TargetUser);
    const follow = TargetUser?.follower.includes(req.userId);
    TargetUser = { ...TargetUser, follow: follow };
    res.status(200).send(TargetUser);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.getpostdetail = async (req, res) => {
  try {
    console.log("This user is: " + req.userId);
    const findpost = await Post.findOne(
      { _id: req.body.postId },
      {
        _id: 0,
        author: 1,
        text: 1,
        post_time: 1,
        visibility: 1,
        post_images: 1,
      }
    );
    res.status(200).send(findpost);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.seefollower = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    const finduserfollower = await User.findById(req.userId, {
      follower: 1,
    }).lean();
    const userfollwerprofileRes = [];
    const userfollower = finduserfollower.follower;
    for (let i = 0; i < userfollower.length; i++) {
      const finduserfollowerprofile = await User.findById(userfollower[i], {
        _id: 1,
        username: 1,
        images: 1,
      }).lean();
      userfollwerprofileRes.push(finduserfollowerprofile);
    }
    console.log("This user has been followed by " + userfollower);
    res.status(200).send(userfollwerprofileRes);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.seefollowing = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    const finduserfollowing = await User.findById(req.userId, {
      following: 1,
    }).lean();
    const userfollwingprofileRes = [];
    const userfollowing = finduserfollowing.following;
    for (let i = 0; i < userfollowing.length; i++) {
      const finduserfollowingprofile = await User.findById(userfollowing[i], {
        _id: 1,
        username: 1,
        images: 1,
      }).lean();
      userfollwingprofileRes.push(finduserfollowingprofile);
    }
    console.log("This user followed " + userfollowing);
    res.status(200).send(userfollwingprofileRes);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.searchuser = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    console.log(
      "Search for user: " + req.body.username + " ID: " + req.body.userId
    );
    const searchresult = await User.findOne(
      { $or: [{ _id: req.body.userId }, { username: req.body.username }] },
      { password: 0 }
    );
    if(!searchresult==true){
      res.status(400).send("User not found");
      return;
    }
    res.status(200).send(searchresult);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};
