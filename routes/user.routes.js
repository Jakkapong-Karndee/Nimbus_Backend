const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    app.get("/api/content/all", controller.allAccess);

    app.get("/api/content/user", [authJwt.verifyToken], controller.userBoard);

    app.post("/api/content/post", [authJwt.verifyToken], controller.post);

    app.get("/api/content/home", controller.home);

    app.get("/api/content/getTotalPageHome", controller.getTotalPageHome);

    app.get("/api/content/profile", [authJwt.verifyToken], controller.profile);

    app.post("/api/content/setting", [authJwt.verifyToken], controller.setting);

    app.post("/api/content/editpost", [authJwt.verifyToken], controller.editpost);

    app.post("/api/content/follow", [authJwt.verifyToken], controller.follow);

};