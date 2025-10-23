const jwt = require("jsonwebtoken");
require('dotenv').config({ path: './touch.env' });

exports.createToken = function(fn, ln, id) {
    return _createToken(fn, ln, id);
}

_createToken = function(fn, ln, id) {
    try {
        const user = { id: id, firstName: fn, lastName: ln }; // use 'id' instead of 'userId' to match decode
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
        var ret = { accessToken: accessToken };
    } catch (e) {
        var ret = { error: e.message };
    }
    return ret;
}

exports.isExpired = function(token) {
    try {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        return false;
    } catch (err) {
        return true;
    }
}

exports.refresh = function(token) {
    var ud = jwt.decode(token, { complete: true });
    var id = ud.payload.id;
    var firstName = ud.payload.firstName;
    var lastName = ud.payload.lastName;
    return _createToken(firstName, lastName, id);
}
