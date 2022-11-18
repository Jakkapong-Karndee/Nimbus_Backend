const db = require("../models");
const Post = db.post;
const User = db.user;
const moment = require("moment");

async function checkLike(req) {
  console.log(req.query.postId);
  const checklike = await Post.exists({
    _id: req.query.postId,
    like: req.userId,
  });

  return checklike ? true : false;
}

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
      const checklike = (await Post.exists({
        _id: home[i]._id,
        like: req.query.userId,
      }))
        ? true
        : false;
      const merged = { ...home[i], islike: checklike, ...finduser };
      postRes.push(merged);
    }
    // console.log(postRes);
    const count = await Post.count({ visibility: "Public" });
    // console.log(count);
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
    console.log(arrayfollowing);
    const postRes = [];
    const findfollowpost = await Post.find({
      author: { $in: arrayfollowing },
      $or: [{ visibility: "Public" }, { visibility: "Follow" }],
    })
      .sort({ post_time: -1 })
      .skip((req.query.page - 1) * 10)
      .limit(10)
      .lean();
    console.log(findfollowpost);

    for (let i = 0; i < findfollowpost.length; i++) {
      const findfollowuserprofile = await User.findOne(
        {
          _id: findfollowpost[i].author,
        },
        {
          _id: 0,
          username: 1,
          images: 1,
        }
      ).lean();
      const checklike = await Post.exists({
        _id: findfollowpost[i]._id,
        like: req.userId,
      });
      const checklikebool = checklike ? true : false;
      const merged = {
        ...findfollowuserprofile,
        islike: checklikebool,
        ...findfollowpost[i],
      };
      postRes.push(merged);
    }
    console.log(postRes);
    const count = await Post.count({
      author: { $in: arrayfollowing },
      $or: [{ visibility: "Public" }, { visibility: "Follow" }],
    });
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
    console.log("This is " + req.query.profile_userID + " profile");
    const TargetUser = await User.findById(req.query.profile_userID);
    // console.log(TargetUser);
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
      islike: v?.like?.includes(req.userId) ? true : false,
      username: TargetUser.username,
      profile_images: TargetUser.images,
    }));
    // console.log(postRes);
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
      islike: v?.like?.includes(req.userId) ? true : false,
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
      { _id: req.query.postId },
      {
        _id: 1,
        author: 1,
        text: 1,
        post_time: 1,
        visibility: 1,
        post_images: 1,
        like: 1,
        comment: 1,
      }
    ).lean();
    const finduser = await User.findOne(
      { _id: findpost.author },
      { username: 1, images: 1, _id: 0 }
    ).lean();
    const checklikebool = await checkLike(req);
    const findpostlike = { ...findpost, islike: checklikebool, ...finduser };
    console.log(checklikebool);
    res.status(200).send(findpostlike);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.seefollower = async (req, res) => {
  try {
    console.log("This user is " + req.query.userId);
    const finduserfollower = await User.findById(req.query.userId, {
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
    console.log("This user is " + req.query.userId);
    const finduserfollowing = await User.findById(req.query.userId, {
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
      "Search for user: " + req.body.username
    );
    const searchresult = await User.findOne(
      { username: req.body.username },
      { password: 0 }
    );
    if (!searchresult == true) {
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

exports.addcomment = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    const findpost = await Post.findOne(
      { _id: req.body.postId },
      { _id: 1, author: 1, text: 1, comment: 1 }
    );
    console.log(findpost);
    if (!findpost == true) {
      res.status(400).send("Post not found");
      return;
    } else {
      const insertcomment = await Post.findOneAndUpdate(
        { _id: req.body.postId },
        {
          $push: {
            comment: {
              usercommentid: req.userId,
              usercomment: req.body.commenttext,
              comment_time: moment().format(),
            },
          },
        }
      );
      res.status(200).send("Comment successfully");
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.deletecomment = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    const findpost = await Post.findOne(
      { _id: req.body.postId, usercommentid: req.userId },
      { _id: 1, author: 1, text: 1, comment: 1 }
    );
    // console.log(findpost);
    if (!findpost == true) {
      res.status(400).send("Post not found");
      return;
    } else {
      const deletecomment = await Post.updateOne(
        {
          _id: req.body.postId,
          commentId: req.body.commentId,
        },
        { $pull: { comment: { _id: req.body.commentId } } }
      );
      console.log(deletecomment);
      res.status(200).send("Delete comment successfully");
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.like = async (req, res) => {
  try {
    console.log("This user is " + req.userId);
    const findpost = await Post.findOne(
      { _id: req.body.postId },
      { _id: 1, author: 1, text: 1, comment: 1 }
    );
    console.log(findpost);
    if (!findpost) {
      res.status(400).send("Post not found");
      return;
    } else {
      const findlike = await Post.findOne({
        _id: req.body.postId,
        like: req.userId,
      });
      console.log(findlike);
      if (!findlike) {
        const addlike = await Post.findOneAndUpdate(
          { _id: req.body.postId },
          {
            $push: {
              like: req.userId,
            },
          }
        );
        res.status(200).send("You like this post");
        return;
      }
      res.status(400).send("You already like this post");
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.unlike = async (req, res) => {
  try {
    const findlike = await Post.findOne({
      _id: req.body.postId,
      like: req.userId,
    });
    console.log(findlike);
    if (!findlike == true) {
      res.status(400).send("You don't like this post yet");
      return;
    }
    const dislike = await Post.findOneAndUpdate(
      { _id: req.body.postId },
      {
        $pull: {
          like: req.userId,
        },
      }
    );
    res.status(200).send("Unlike successfully");
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

exports.getPostComment = async (req, res) => {
  try {
    console.log("This user is: " + req.userId);
    const findpostcomment = await Post.findOne(
      { _id: req.query.postId },
      { comment: 1 }
    ).lean();
    // console.log(findpostcomment.comment[0].usercommentid);
    // console.log(findpostcomment.comment.length);
    const userpostcomment = [];
    for (let i = 0; i < findpostcomment.comment.length; i++) {
      const finduser = await User.findOne(
        { _id: findpostcomment.comment[i].usercommentid },
        { _id: 0, username: 1, images: 1 }
      ).lean();
      console.log(finduser);
      const merged = { ...findpostcomment.comment[i], ...finduser };
      userpostcomment.push(merged);
    }
    res.status(200).send(userpostcomment);
    return;
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};
