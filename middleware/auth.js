'use strict';

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');
const { UnauthorizedError } = require('../expressError');

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
	try {
		const authHeader = req.headers && req.headers.authorization;
		if (authHeader) {
			const token = authHeader.replace(/^[Bb]earer /, '').trim();
			res.locals.user = jwt.verify(token, SECRET_KEY);
		}
		return next();
	} catch (err) {
		return next();
	}
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
	try {
		if (!res.locals.user) throw new UnauthorizedError();

		return next();
	} catch (err) {
		return next(err);
	}
}

/* Middleware to use for users that need to be Admin type users for adding, updating, and deleting companies.

If not, raises Unauthorized.
*/

function ensureAdmin(req, res, next) {
	try {
		if (res.locals.user === undefined || res.locals.user.isAdmin === false) throw new UnauthorizedError();
		return next();
	} catch (err) {
		return next(err);
	}
}

/* Middleware function to use for verifying if the current logged in user is either an admin or the user that is trying to view, update, or delete their profile information.

If not, return unauthorized error

*/
function checkUserOrAdmin(req, res, next) {
	try {
		const currUser = res.locals.user;
		if (!(currUser && (currUser.isAdmin || currUser.username === req.params.username))) {
			throw new UnauthorizedError();
		} else {
			return next();
		}
	} catch (err) {
		return next(err);
	}
}

module.exports = {
	authenticateJWT,
	ensureLoggedIn,
	ensureAdmin,
	checkUserOrAdmin
};
