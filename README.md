# Jobly Backend

This is the Express backend for Jobly, version 2.

To run this:

    node server.js OR nodemon server.js
    
To run the tests:

    jest -i

---

## Table of Contents:
* [Part I](#part-i)
* [Part II](#part-ii)
	* [Testing](#testing)
* [Part III](#part-iii)
	* [Testing](#tests)
* [Part IV](#part-iv)
	* [Testing](#testing-1)
* [Part V](#part-v)
	* [Testing](#testing-2)
* [Final](#final)


---

## Part I:

- First part of assignment was to add testing for the `sqlForPartialUpdate()` method defined under the `helpers/sql.js` file.

Original Code:
```JS
const { BadRequestError } = require('../expressError');

// THIS NEEDS SOME GREAT DOCUMENTATION.

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
	const keys = Object.keys(dataToUpdate);
	if (keys.length === 0) throw new BadRequestError('No data');

	// {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
	const cols = keys.map((colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`);

	return {
		setCols: cols.join(', '),
		values: Object.values(dataToUpdate)
	};
}

module.exports = { sqlForPartialUpdate };
```

- Along with writing tests for this file, the assignment also had us add documentation to the function to help mimic real world projects that we would be interacting with and using code that we didn't write and or wasn't documented.

Documentation added:
```JS
const { BadRequestError } = require('../expressError');

/*
sqlForPartialUpadte is responsible for generating the SQL query from the data received through the API request body. Since the current schema is NOT using the correct headers for the backend db, this function will generate the needed columnn values for the User class to make the update query to Postgres.

Function is expecting TWO objects:

- dataToUpdate = request body object received from client.
Ex:
{
	firstName: 'testing',
	lastName: 'again',
	isAdmin: false
};

- jsToSql = object that is specifying property names that need to be updated to match the current backend schema.
Ex: 
{
	firstName: 'first_name',
	lastName: 'last_name',
	isAdmin: 'is_admin'
}

function then takes the keys from the first object (dataToUpdate) and creates a keys array which will contain all the keys from the data received from API
Ex:
keys = ['firstName', 'lastName, 'isAdmin']

 - NOTE: If the keys array length = 0 (no data received), error is returned.

cols variable is creating a new array which is looping over the keys array to set the value of the jsToSql object for that same key equal to the index for that key + 1.

function returns an object with two properties setCols and values.

- seCols = long string of all the columns being updated with their correct column definition per our db schema. Also including sanitation for our inputs to prevent any attacks. 

- values: array of values that were passed in through the dataToUpdate object. Array is created by using the Object.values() method.
Ex:
{
  setCols: '"first_name"=$1, "last_name"=$2, "is_admin"=$3',
	values: [ 'testing', 'again', false ]
}

*/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
	const keys = Object.keys(dataToUpdate);
	if (keys.length === 0) throw new BadRequestError('No data');

	// {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
	const cols = keys.map((colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`);

	return {
		setCols: cols.join(', '),
		values: Object.values(dataToUpdate)
	};
}

module.exports = { sqlForPartialUpdate };
```

- Once the documentation was written as shown above, a new file was created `sql.test.js` to test the functionality of the helper function.

```JS
const { sqlForPartialUpdate } = require('./sql');
const { BadRequestError } = require('../expressError');

const testObj = {
	firstName: 'testing',
	lastName: 'again',
	isAdmin: false
};

describe('test helper function', function() {
	test('test sqlForPartialUpdate with success', function() {
		const result = sqlForPartialUpdate(testObj, {
			firstName: 'first_name',
			lastName: 'last_name',
			isAdmin: 'is_admin'
		});

		expect(result).toEqual({
			setCols: '"first_name"=$1, "last_name"=$2, "is_admin"=$3',
			values: [ 'testing', 'again', false ]
		});
	});

	// link for testing failure with jest specifically using other functions: https://medium.com/@afolabiwaheed/how-to-test-a-function-thats-expected-to-throw-error-in-jest-2419cc7c6462
	test('fail sqlForPartialUpdate', function() {
		expect(function() {
			sqlForPartialUpdate({}, { firstName: 'first_name', lastName: 'last_name', isAdmin: 'is_admin' });
		}).toThrow('No data');
	});
});
```

- The tests are quite simple and help keep great `jest coverage` for the already completed application. 

- First, the test file is importing the `sqlForPartialUpdate()` function along with the `BadRequestError` from the main custom error file.

    - This was done in order to allow testing for failures in the event the `data` object contained nothing which is the data that one would be sending through their request body.

- `testObj` variable is setting a dummy data value which we can test for a successful return which is an object that contains the updated object properties and the values for each.

- The second test is ensuring that an empty `data` object passed through `sqlForPartialUpdate` will throw an error HOWEVER, in order to properly test for an error, we must run the function inside a callback as stated in [this](https://medium.com/@afolabiwaheed/how-to-test-a-function-thats-expected-to-throw-error-in-jest-2419cc7c6462) article I found while doing research. Ironically enough, this article also points back to the `jest` docs on this very topic.

* [Back to Top](#table-of-contents)

---

## Part II:

- The second part of the assignment focuses on adding new features to the `companies` routes for the API which allows a user to pass in filtering through the `query string` from the url and receive responses based on the filtering similar to filtering posts on a site like reddit by most upvoted or newest or trending etc.

__NOTE:__ The querystring module is listed as deprecated BUT the module and its methods can still be uesd. The alternative is using the `URLSearchParams` class to see the query string passed in but this solution can be confusing to use so another good alternative is using the the base `URL` class and accessing the `searchParams` property but the issue using this is that the url passed in is not an entire `HTTP` url from my understanding so I stuck with `querystring`.

- The next part the assignment requested was to enable filtering through the incoming request for the main `/companies` `GET` route via the query params.

	- The assignment has the requirements that we are to look out for filtering the results based on `name`, `minEmployees` and `maxEmployees`.
		- IF `maxEmployees` > `minEmployees`, error should be returned.
	
	- Another requirement that the assignment asked is return all companies if no filters are passed OR if only a few of the filters are passed in.

	- Assignment then required that the models files do the queries ONLY.

- The first approach I took was setting up the `SQL` queries manually so I know how to set the conditional logic on the model file as shown below.

Query to filter names
```SQL
SELECT handle,
name,
description,
num_employees AS "numEmployees",
logo_url AS "logoUrl"
FROM companies
WHERE name LIKE '%[search_query]%'
ORDER BY name;
```

Query to filter by number of employees between two numbers
```SQL
SELECT handle,
name,
description,
num_employees AS "numEmployees",
logo_url AS "logoUrl"
FROM companies
WHERE num_employees BETWEEN X AND Y
ORDER BY num_employees DESC;
```

Query to filter number of employees by a minimum number
```SQL
SELECT handle,
name,
description,
num_employees AS "numEmployees",
logo_url AS "logoUrl"
FROM companies
WHERE num_employees >= [NUMBER]
ORDER BY num_employees DESC;
```

Query to filter number of employees to a max number
```SQL
SELECT handle,
name,
description,
num_employees AS "numEmployees",
logo_url AS "logoUrl"
FROM companies
WHERE num_employees < [NUMBER]
ORDER BY num_employees DESC;
```

### Testing 

- Along with creating the updated logic for the companies routes, we were also required to ensure that all tests remain passing so below are the test updates / additions that were made under the main testing file to allow tests to continue passing.

```JS
// routes/_testCommon.js

const u1Token = createToken({ username: 'u1', isAdmin: false });
```

- With the changes made to the middleware `auth.js` file, non-admins cannot create new companies or new users. Since we are exporting a base token from the `_testCommon.js` file, I updated the `isAdmin` property to read as `true` which allowed 76/80 tests to pass.

```JS
// routes/_testCommon.js - DIEGO Update

const u1Token = createToken({ username: 'u1', isAdmin: true });
```

* [Back to Top](#table-of-contents)

---

## Part III:

- The third part of the assignment focused on updating and adding authorization for specific `companies` routes. 

- Requirements for part A of this step is as follows:

	- `GET` to `/companies` and `/companies/:handle` should remain visible to all users (even those with no credentials).

	- `POST` to `companies` now needs to ensure that a user is logged in AND contains `isAdmin: true` in their user `JWT` object otherwise, the route should return a `401` response.

	- `PATCH` to `/companies/:handle` now needs to ensure that a user is logged in AND contains `isAdmin: true` in their user `JWT` object otherwise, the route should return a `401` response.

	- `DELETE` to `/companies/:handle` now needs to ensure that a user is logged in AND contains `isAdmin: true` in their user `JWT` object otherwise, the route should return a `401` response.

	- As an added task, the code for the copmanies route does NOT need to be changed but instead, we were tasked with finding a way of testing for the `isAdmin` property from the request received through the token instead of making a query to the backend or implementing new code.

- The first step I took in my approach was to setup a new middleware function that does the `isAdmin` validation that can be called on the routes however, this could potentially cause a security flaw if an attacker finds that only the `isAdmin` property is needed to make backend changes to a company.

```JS
// middleware/authjs

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
```

- I then tinkered with the `ensureLoggedIn` function and used a `console.log` call to see the object for each request where a user needed to be logged in and since we could see the property under the `locals` object for each `response`, I tested to see if we could access this same object via the normal routes in the `companies.js` route file.

- The main reason I did this was because I wanted to verify if the `locals` object is a global scope that is set once a user has been logged in with their `JWT` which makes the task of not updating the route code for the companies much easier.

- Since the test came back as successful, then I now had the solution on ensuring that a user is logged in AND is an admin for adding, updating, and deleting a company.

- I then added the following line to the route functions in the `companies.js` route file:

```JS
/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: Admin ONLY
 */

router.post('/', ensureAdmin, async function(req, res, next) { // ---> added ensureAdmin middleware function to prevent any logic change in route function.
	try {
		const validator = jsonschema.validate(req.body, companyNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const company = await Company.create(req.body);
		return res.status(201).json({ company });
	} catch (err) {
		return next(err);
	}
});


/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: Admins ONLY
 */

router.patch('/:handle', ensureAdmin, async function(req, res, next) { // ---> added ensureAdmin middleware function to prevent any logic change in route function.
	try {
		const validator = jsonschema.validate(req.body, companyUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const company = await Company.update(req.params.handle, req.body);
		return res.json({ company });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: Admin ONLY
 */

router.delete('/:handle', ensureAdmin, async function(req, res, next) { // // ---> added ensureAdmin middleware function to prevent any logic change in route function.
	try {
		await Company.remove(req.params.handle);
		return res.json({ deleted: req.params.handle });
	} catch (err) {
		return next(err);
	}
});
```

- Once the companies routes were updated, we were then asked to update the `users` routes.

- The requirements for this part as as defined below:

	- Creating new users should only be allowed for admins. Registration route however, should remain open for everyone.

	- Getting the list of all users should only be allowed for admin type users.

	- Viewing user information, updating, or deleting a user, should only be allowed by an admin OR by that very same user.

- The first step I took in my solution is to get the last request implemented for viewing, updating, or deleting users for both the user and an admin.

```JS
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

```

- The solution I resorted to which would result in minimal code changes was to add a new middlware function to check for either admin status on the user object or verifying if the user object is the same as the param username that was sent through the URL which is the solution above.

- Once that was done, I used the two new middleware functions on the `users` routes file replacing the `ensureLoggedIn` function which are all the updates below.


```JS
/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: Admin ONLY
 **/

router.post('/', ensureAdmin, async function(req, res, next) { // ---> Diego added ensureAdmin middleware function.
	try {
		const validator = jsonschema.validate(req.body, userNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const user = await User.register(req.body);
		const token = createToken(user);
		return res.status(201).json({ user, token });
	} catch (err) {
		return next(err);
	}
});
```

- Since I wrote a new method to the `middleware` directory for checking admin status, I replaced the `ensureLoggedIn` middleware function with `ensureAdmin` function which returns a 401 error if the current user that is logged in is not an admin as only admins can create new users through the `/users` route under a `POST` request.

- I also added the new middleware to the main `GET` route for users as only admins are allowed to view the entire list of users.

```JS
/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: Admin ONLY
 **/

router.get('/', ensureAdmin, async function(req, res, next) { // ---> Diego added the ensureAdmin middleware function.
	try {
		const users = await User.findAll();
		return res.json({ users });
	} catch (err) {
		return next(err);
	}
});
```

- The final updates I made to the `users` routes was adding the `ensureAdmin` function to the `PATCH` and `DELETE` routes.

```JS
/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: login OR admin
 **/

router.patch('/:username', checkUserOrAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, userUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const user = await User.update(req.params.username, req.body);
		return res.json({ user });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: login OR admin
 **/

router.delete('/:username', checkUserOrAdmin, async function(req, res, next) {
	try {
		await User.remove(req.params.username);
		return res.json({ deleted: req.params.username });
	} catch (err) {
		return next(err);
	}
});
```

### Tests

- Once the route updates were completed, we were then asked to ensure that all previous tests for these routes were modified to match the additional tests and the tests were updated as shown below.

- One of the main issues I first encountered with the updated logic is the tests making `POST` requests were responding with a `500` error whenever the test tried to send an anonymous (non-authenticated) `POST` request.

- The main issue that I was facing is the logic inside the `ensureAdmin` middleware is the previous logic was only checking to see if a user was already logged in and was only focusing on the `isAdmin` property which wouldn't be defined for anon requests through `POST` requests. This means that the `res.locals.user` object for anon requests was set as `undefined` and because of this, the previous logic was returning a `500` error in the response instead of `401` which is what the API should be responding with. The updated logic now checks to see if the `res.locals.user` object is `undefined` OR if the `res.locals.user.isAdmin` property is set as false (non-admin user). If either of these are the case, then the middleware should return a new `UnauthorizedError`.

```JS
// middlware/auth.js BEFORE
function ensureAdmin(req, res, next) {
	try {
		if (!res.locals.user.isAdmin) throw new UnauthorizedError();
		return next();
	} catch (err) {
		return next(err);
	}
}
```

```JS
// middleware/auth.js AFTER
function ensureAdmin(req, res, next) {
	try {
		if (res.locals.user === undefined || res.locals.user.isAdmin === false) throw new UnauthorizedError();
		return next();
	} catch (err) {
		return next(err);
	}
}
```

- The remaining tests that were failing were regarding a user creating a new user or a new company along with deleting, or updating a user/company. Since the middleware functions are now checking for `isAdmin: true`, the `_testCommon.js` file was tweaked as previously shown [above](#testing).

- After the base tests were updated, I was left with the new updated logic that was created under the `getAll()` class method for `company.js` model. 

- New tests were added to test the following additions:

	- `Company.getAll()` should be returning error if `minEmployees` > `maxExmployees`
	- `Company.getAll()` should be returning results from the backend db if we pass in any of the following properties:
		- `minEmployees`
		- `maxEmployees`
		- `name`
	
	- `/companies` `GET` route should be returning error if an invalid property is passed through the `query string` for a `GET` request.
	- `/companies` `GET` route should also be accepting string numbers but using unary operator `+` turns the string into a number.

```JS
// models/company.test.js
describe('findAll', function() {
	test('works: no filter', async function() {
		let companies = await Company.findAll();
		expect(companies).toEqual([
			{
				handle: 'c1',
				name: 'C1',
				description: 'Desc1',
				numEmployees: 1,
				logoUrl: 'http://c1.img'
			},
			{
				handle: 'c2',
				name: 'C2',
				description: 'Desc2',
				numEmployees: 2,
				logoUrl: 'http://c2.img'
			},
			{
				handle: 'c3',
				name: 'C3',
				description: 'Desc3',
				numEmployees: 3,
				logoUrl: 'http://c3.img'
			}
		]);
	});

	/******************* ADDITIONAL TESTS *********************/

	test('works: create query with minEmployees property ONLY', async function() {
		let filteredQuery = await Company.findAll({ minEmployees: 2 });

		expect(filteredQuery).toEqual([
			{
				handle: 'c2',
				name: 'C2',
				description: 'Desc2',
				numEmployees: 2,
				logoUrl: 'http://c2.img'
			},
			{
				handle: 'c3',
				name: 'C3',
				description: 'Desc3',
				numEmployees: 3,
				logoUrl: 'http://c3.img'
			}
		]);
	});

	test('works: create query with maxEmployees property ONLY', async function() {
		let filteredQuery = await Company.findAll({ maxEmployees: 2 });

		expect(filteredQuery).toEqual([
			{
				handle: 'c1',
				name: 'C1',
				description: 'Desc1',
				numEmployees: 1,
				logoUrl: 'http://c1.img'
			},
			{
				handle: 'c2',
				name: 'C2',
				description: 'Desc2',
				numEmployees: 2,
				logoUrl: 'http://c2.img'
			}
		]);
	});

	test('works: create query with name property ONLY', async function() {
		let filteredQuery = await Company.findAll({ name: 'C1' });

		expect(filteredQuery).toEqual([
			{
				handle: 'c1',
				name: 'C1',
				description: 'Desc1',
				numEmployees: 1,
				logoUrl: 'http://c1.img'
			}
		]);
	});

	test('failure: minEmployees > maxEmployees', async function() {
		try {
			let companies = await Company.findAll({ minEmployees: 20, maxEmployees: 5 });
			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});

	/******************* END ADDITIONAL TESTS *********************/

});
```

```JS
// routes/companies.test.js

describe('GET /companies', function() {
	test('ok for anon', async function() {
		const resp = await request(app).get('/companies');
		expect(resp.body).toEqual({
			companies: [
				{
					handle: 'c1',
					name: 'C1',
					description: 'Desc1',
					numEmployees: 1,
					logoUrl: 'http://c1.img'
				},
				{
					handle: 'c2',
					name: 'C2',
					description: 'Desc2',
					numEmployees: 2,
					logoUrl: 'http://c2.img'
				},
				{
					handle: 'c3',
					name: 'C3',
					description: 'Desc3',
					numEmployees: 3,
					logoUrl: 'http://c3.img'
				}
			]
		});
	});

	/******************* ADDITIONAL TESTS *********************/

	test('failure: invalid data for filtering /companies results', async function() {
		const resp = await request(app).get('/companies?minEmployees=2&color=purple');

		expect(resp.statusCode).toEqual(400);
	});

	test('data check: ensure query string minEmployees turns into number', async function() {
		const resp = await request(app).get('/companies?minEmployees=2&maxEmployees=3');

		let queryString = new URL(resp.request.url).searchParams;
		let min = queryString.get('minEmployees');
		let max = queryString.get('maxEmployees');
		expect(+min).toEqual(2);
		expect(+max).toEqual(3);
	});

	/******************* END ADDITIONAL TESTS *********************/

	test('fails: test next() handler', async function() {
		// there's no normal failure event which will cause this route to fail ---
		// thus making it hard to test that the error-handler works with it. This
		// should cause an error, all right :)
		await db.query('DROP TABLE companies CASCADE');
		const resp = await request(app).get('/companies').set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(500);
	});
});
```

* [Back to Top](#table-of-contents)

---

## Part IV

- Part IV begins with reviewing the `jobs` table in our backend database.

- We were then instructed to review the schema for this table and why the `NUMERIC` data type was used for `equity` column instead of using `INTEGER` or `FLOAT`.

	- From my research and reading [this](https://learnsql.com/blog/understanding-numerical-data-types-sql/) article, `NUMERIC` data types are exact numeric values that CANNOT be added or compared. In addition, this data type ensures that the column values contain X many digits or are above/below a certain numeric value which developers set during the creation of the db.
	- The article als pointed out that `NUMERIC` data types should only be used to contain financial information. 
	- From reading more about the meaning of __equity__ in the financial / corporate world, this value is a percentage of ownership that one would have of the company and since this is a percentage it cannot be higher than 1.0 which would be 100% ownership of the company hence why some of the equity values are seen as values in the thousandths (0.012 = 1.2% equity).

- Once we reviewed the table for jobs, we were instructred to create the model and routes for the table since that wasn't implemented along with writing the tests for the new models and routes to continue the good coverage of the previous tests.

- First step I took was to create the `model` file for the base queries. Since we were given a hit to use the `company` model to create our model, I proceeded to use most of the same logic from this file to the `job.js` file as shown below:

```JS
// models/job.js

class Job {
	/** Create a job (from data received), update the db, and return the new job data.
     * 
     * data should be {title, salary, equity, company_handle}
     * 
     * returns {id, title, salary, equity, companyHandle}
     * 
     * 
     */

	static async createJob({ title, salary, equity, company_handle }) {
		if (!title || !salary || !company_handle) {
			throw new BadRequestError('Missing required data: title/salary/company_handle');
		}

		const result = await db.query(
			`
            INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"
        `,
			[ title, salary, equity, company_handle ]
		);

		const job = result.rows[0];
		return job;
	}

	/** View all Jobs available.
     * 
     * Returns [{id, title, salary, equity, companyHandle}, ...]
     * 
     * allows for filtering based on title, minSalary, or hasEquity which is received via object.
     */

	static async allJobs(query = {}) {
		let mainQuery = `
            SELECT
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"
            FROM jobs
        `;

		let where = [];
		let values = [];

		const { title, minSalary, hasEquity } = query;

		if (minSalary < 0) {
			return new BadRequestError('minSalary must be value above 0');
		}

		if (title) {
			values.push(`%${title}%`);
			where.push(`title ILIKE $${values.length}`);
		}

		if (minSalary !== undefined) {
			values.push(minSalary);
			where.push(`salary >= $${values.length}`);
		}

		if (hasEquity === 'true') {
			where.push(`equity > 0`);
		}

		if (hasEquity === 'false') {
			where.push('equity IS null OR equity = 0');
		}

		if (where.length > 0) {
			mainQuery += ' WHERE ' + where.join(' AND ');
		}

		mainQuery += ' ORDER BY salary';

		const jobRes = await db.query(mainQuery, values);
		return jobRes.rows;
	}

	/** Given job id, return job infromation for that specific id.
     * 
     * Returns {id, title, salary, equity, companyHandle}
     * 
     * Throws NotFoundError if not found.
     * 
     */

	static async get(id) {
		const jobRes = await db.query(
			`
            SELECT 
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1
        `,
			[ id ]
		);

		const job = jobRes.rows[0];

		if (!job) throw new NotFoundError(`No Job Id: ${id}`);

		return job;
	}

	/** Update job with 'data' object. 
     * 
     * This is a partial update similar to how companies are updated so it is OKAY if not all data is present during the update.
     * 
     * Data can include: {title, salary, equity}
     * 
     * Returns {id, title, salary, equity, companyHandle}
     * 
     * Throws NotFoundError if id not found.
     * 
    */

	static async update(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			title: 'title',
			salary: 'salary',
			equity: 'equity'
		});

		const idIndx = '$' + (values.length + 1);

		const updateQuery = `
            UPDATE jobs
            SET ${setCols}
            WHERE id = ${idIndx}
            RETURNING
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"
        `;

		const result = await db.query(updateQuery, [ ...values, id ]);

		const job = result.rows[0];

		if (!job) throw new NotFoundError(`No job with id: ${id}`);

		return job;
	}

	/** Delete a given job id from database; returns undefined
     * 
     * Throws NotFoundError if job id is not found.
     * 
     */

	static async delete(id) {
		const result = await db.query(
			`
            DELETE FROM jobs
            WHERE id = $1
            RETURNING id
        `,
			[ id ]
		);

		const job = result.rows[0];

		if (!job) throw new NotFoundError(`No job with id: ${id}`);
	}
}
```

- One thing to point out from above is the way that I am checking the `hasEquity` property for a string version of the boolean value such as `'true'` or `'false'` and this is because the `query string` is not turning the value passed in into a boolean and the previous conditional testing for the actual boolean values was not applying the filtering so I took the simple solution of checking for the string values from [this](https://stackoverflow.com/questions/263965/how-can-i-convert-a-string-to-boolean-in-javascript) stack overflow thread.


- Once the routes were completed 

### Testing:

- After the `Job` model file and the `jobs` route file were completed, we were instructed to create the testing for the model and the routes to ensure everything works as intended. Again, I took inspiration from the testing file that is listed under the `company` / `companies` files.

```JS
// models/job.test.js
describe('createJob', function() {
	const newJob = {
		title: 'newJob',
		salary: 12000,
		equity: 0,
		company_handle: 'c2'
	};

	const failJob = {
		salary: 10000,
		equity: 0.12,
		company_handle: 'c1'
	};

	test('works: creates a new job', async function() {
		let job = await Job.createJob(newJob);

		expect(job).toEqual({
			id: expect.any(Number),
			title: 'newJob',
			salary: 12000,
			equity: '0',
			companyHandle: 'c2'
		});

		const results = await db.query(`
            SELECT
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"
            FROM jobs
            WHERE title = 'newJob'
        `);

		expect(results.rows).toEqual([
			{
				id: expect.any(Number),
				title: 'newJob',
				salary: 12000,
				equity: '0',
				companyHandle: 'c2'
			}
		]);
	});

	test('FAIL: missing information', async function() {
		try {
			await Job.createJob(failJob);
			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/************************************ allJobs */

describe('allJobs', function() {
	test('works: no filters', async function() {
		let jobs = await Job.allJobs();

		expect(jobs).toEqual([
			{
				id: expect.any(Number),
				title: 'j1',
				salary: 30000,
				equity: '0',
				companyHandle: 'c1'
			},
			{
				id: expect.any(Number),
				title: 'j2',
				salary: 40000,
				equity: '0.23',
				companyHandle: 'c2'
			},
			{
				id: expect.any(Number),
				title: 'j3',
				salary: 55000,
				equity: '0.15',
				companyHandle: 'c3'
			}
		]);
	});

	test('works: filtering with title ONLY', async function() {
		let filteredJob = await Job.allJobs({ title: 'j2' });

		expect(filteredJob).toEqual([
			{
				id: expect.any(Number),
				title: 'j2',
				salary: 40000,
				equity: '0.23',
				companyHandle: 'c2'
			}
		]);
	});

	test('works: filtering with minSalary ONLY', async function() {
		let filteredJob = await Job.allJobs({ minSalary: 40000 });

		expect(filteredJob).toEqual([
			{
				id: expect.any(Number),
				title: 'j2',
				salary: 40000,
				equity: '0.23',
				companyHandle: 'c2'
			},
			{
				id: expect.any(Number),
				title: 'j3',
				salary: 55000,
				equity: '0.15',
				companyHandle: 'c3'
			}
		]);
	});

	test('works: filtering with hasEquity: true', async function() {
		let filteredJob = await Job.allJobs({ hasEquity: 'true' });

		expect(filteredJob).toEqual([
			{ id: expect.any(Number), title: 'j2', salary: 40000, equity: '0.23', companyHandle: 'c2' },
			{ id: expect.any(Number), title: 'j3', salary: 55000, equity: '0.15', companyHandle: 'c3' }
		]);
	});

	test('works: filtering with hasEquity: false', async function() {
		let filteredJob = await Job.allJobs({ hasEquity: 'false' });

		expect(filteredJob).toEqual([
			{ id: expect.any(Number), title: 'j1', salary: 30000, equity: '0', companyHandle: 'c1' }
		]);
	});

	test('FAIL: filtering with salary < 0', async function() {
		try {
			let job = await Job.allJobs({ minSalary: -1 });
			expect(job.status).toBe(400);
		} catch (err) {
			next(err);
		}
	});
});

/************************************ get */

describe('get', function() {
	test('works: getting a job by id', async function() {
		let testJob = {
			title: 'getThis',
			salary: 40000,
			equity: 0.2,
			company_handle: 'c1'
		};
		let newJob = await Job.createJob(testJob);

		const results = await Job.get(newJob.id);

		expect(results).toEqual({
			id: expect.any(Number),
			title: 'getThis',
			salary: 40000,
			equity: '0.2',
			companyHandle: 'c1'
		});
	});

	test('FAIL: error if id requested does not exist', async function() {
		try {
			await Job.get(777);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy;
		}
	});
});

/************************************ update */

describe('update', function() {
	const updateJob = {
		title: 'update this title',
		salary: 70000,
		equity: 0.014,
		company_handle: 'c1'
	};

	const secondUpdate = {
		title: 'update',
		salary: 30000,
		equity: 0.011,
		company_handle: 'c2'
	};

	const failUpdate = {
		title: 'fail to update',
		salary: 30000,
		equity: 0.011,
		company_handle: 'c3'
	};

	test('works with partial data', async function() {
		let j = await Job.createJob(updateJob);

		let updatedJ = await Job.update(j.id, { title: 'updated title', salary: 69000 });

		expect(updatedJ).toEqual({
			id: expect.any(Number),
			title: 'updated title',
			salary: 69000,
			equity: '0.014',
			companyHandle: 'c1'
		});

		const result = await db.query(`
			SELECT id, title, salary, equity, company_handle AS "companyHandle"
			FROM jobs
			WHERE id = ${updatedJ.id}
		`);

		expect(result.rows).toEqual([
			{
				id: expect.any(Number),
				title: 'updated title',
				salary: 69000,
				equity: '0.014',
				companyHandle: 'c1'
			}
		]);
	});

	test('works with ALL data', async function() {
		let j = await Job.createJob(secondUpdate);

		let updatedJ = await Job.update(j.id, { title: 'updated again', salary: 45000, equity: 0.015 });

		expect(updatedJ).toEqual({
			id: expect.any(Number),
			title: 'updated again',
			salary: 45000,
			equity: '0.015',
			companyHandle: 'c2'
		});

		const result = await db.query(`
			SELECT id, title, salary, equity, company_handle AS "companyHandle"
			FROM jobs
			WHERE id = ${updatedJ.id}
		`);

		expect(result.rows).toEqual([
			{
				id: expect.any(Number),
				title: 'updated again',
				salary: 45000,
				equity: '0.015',
				companyHandle: 'c2'
			}
		]);
	});

	test('FAIL: invalid id', async function() {
		try {
			await Job.update(777, { title: 'updated again', salary: 45000, equity: 0.015 });
			fali();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('FAIL: bad request with no data', async function() {
		try {
			let j = await Job.createJob(failUpdate);

			await Job.update(j.id, {});
			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

/************************************ delete */

describe('delete', function() {
	const jobDelete = {
		title: 'fail to update',
		salary: 30000,
		equity: 0.011,
		company_handle: 'c3'
	};

	test('works: succesfully delete job', async function() {
		let jobToRemove = await Job.createJob(jobDelete);

		await Job.delete(jobToRemove.id);
		const resp = await db.query(`SELECT title FROM jobs WHERE id = ${jobToRemove.id}`);
		expect(resp.rows.length).toEqual(0);
	});

	test('FAIL: invalid id', async function() {
		try {
			await Job.delete(777);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});
```

- Once the model testing was completed, I moved over to the testing for the routes that were defined for `jobs`

```JS
// routes/jobs.test.js
/*********************************************** POST /jobs */
describe('POST /jobs', function() {
	const newJob = {
		title: 'admin job I',
		salary: 30000,
		equity: 0.005,
		company_handle: 'c1'
	};

	test('works: valid admin authorization', async function() {
		const resp = await request(app).post('/jobs').send(newJob).set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(201),
			expect(resp.body).toEqual({
				job: {
					id: expect.any(Number),
					title: newJob.title,
					salary: newJob.salary,
					equity: `${newJob.equity}`,
					companyHandle: newJob.company_handle
				}
			});
	});

	test('FAIL: bad request with missing data (still admin)', async function() {
		const resp = await request(app)
			.post('/jobs')
			.send({ title: 'admin Job II', salary: 32000 })
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(400);
	});

	test('FAIL: bad request with invalid data (still admin)', async function() {
		const resp = await request(app)
			.post('/jobs')
			.send({ title: 1234, salary: 33000, equity: 0, company_handle: 'c3' })
			.set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(400);
	});

	test('FAIL: non-admin user 401 error', async function() {
		const resp = await request(app)
			.post('/jobs')
			.send({ title: 'fail', salary: 0, equity: 0.002, company_handle: 'c2' })
			.set('authorization', `Bearer ${u2Token}`);

		expect(resp.statusCode).toEqual(401);
	});
});

/*********************************************** GET /jobs */

describe('GET /jobs', function() {
	test('works: anon users can view all jobs', async function() {
		const resp = await request(app).get('/jobs');
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({
			jobs: [
				{
					id: expect.any(Number),
					title: 'j1',
					salary: 34000,
					equity: '0.012',
					companyHandle: 'c1'
				},
				{
					id: expect.any(Number),
					title: 'j2',
					salary: 40000,
					equity: null,
					companyHandle: 'c2'
				},
				{
					id: expect.any(Number),
					title: 'j3',
					salary: 45000,
					equity: '0.019',
					companyHandle: 'c3'
				}
			]
		});
	});

	test('FAIL: invalid data in query string for filtering', async function() {
		const resp = await request(app).get('/jobs?minSalary=20000&color=purple');
		expect(resp.statusCode).toEqual(400);
	});

	// took this from the companies.test.js file.
	test('fails: test next() handler', async function() {
		// there's no normal failure event which will cause this route to fail ---
		// thus making it hard to test that the error-handler works with it. This
		// should cause an error, all right :)
		await db.query('DROP TABLE jobs CASCADE');
		const resp = await request(app).get('/jobs').set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(500);
	});
});

/*********************************************** GET /jobs/:id */

describe('GET /jobs/:id', function() {
	const testJob = { title: 'testJob', salary: 35000, equity: 0.02, company_handle: 'c2' };

	test('works: anon users', async function() {
		const job = await Job.createJob(testJob);

		const resp = await request(app).get(`/jobs/${job.id}`);

		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({
			job: {
				id: expect.any(Number),
				title: 'testJob',
				salary: 35000,
				equity: '0.02',
				companyHandle: 'c2'
			}
		});
	});

	test('FAIL: invalid id returns 404', async function() {
		const resp = await request(app).get('/jobs/999');

		expect(resp.statusCode).toEqual(404);
	});
});

/*********************************************** PATCH /jobs/:id */

describe('PATCH /jobs/:id', function() {
	const updateJob = {
		title: 'pls update',
		salary: 45000,
		equity: 0.013,
		company_handle: 'c1'
	};

	const nonAuth = {
		title: 'pls update',
		salary: 45000,
		equity: 0.013,
		company_handle: 'c2'
	};

	const nonAuth2 = {
		title: 'fails',
		salary: 45000,
		equity: 0.013,
		company_handle: 'c2'
	};

	const badRequestJob = {
		title: 'bad request',
		salary: 45000,
		equity: 0.013,
		company_handle: 'c2'
	};

	const missingDataJob = {
		title: 'missing data',
		salary: 47000,
		equity: 0.013,
		company_handle: 'c2'
	};

	test('works: ADMIN only', async function() {
		const job = await Job.createJob(updateJob);

		const resp = await request(app)
			.patch(`/jobs/${job.id}`)
			.send({ title: 'updated', salary: 50000 })
			.set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({
			job: {
				id: expect.any(Number),
				title: 'updated',
				salary: 50000,
				equity: '0.013',
				companyHandle: 'c1'
			}
		});
	});

	test('FAIL: anon users => 401 error', async function() {
		const job = await Job.createJob(nonAuth);

		const resp = await request(app).patch(`/jobs/${job.id}`).send({ title: 'nope' });

		expect(resp.statusCode).toEqual(401);
	});

	test('FAIL: non-auth users => 401 error', async function() {
		const job = await Job.createJob(nonAuth2);

		const resp = await request(app)
			.patch(`/jobs/${job.id}`)
			.send({ title: 'nope again', salary: 50000 })
			.set('authorization', `Bearer ${u2Token}`);

		expect(resp.statusCode).toEqual(401);
	});

	test('FAIL: invalid id => 404 error (ADMIN)', async function() {
		const resp = await request(app)
			.patch('/jobs/12312313')
			.send({ title: 'another nope naw mean?' })
			.set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(404);
	});

	test('FAIL: invalid data => 400 error (ADMIN)', async function() {
		const job = await Job.createJob(badRequestJob);
		const resp = await request(app)
			.patch(`/jobs/${job.id}`)
			.send({ title: 1234 })
			.set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(400);
	});

	test('FAIL: missing data => 400 error (ADMIN)', async function() {
		const job = await Job.createJob(missingDataJob);

		const resp = await request(app).patch(`/jobs/${job.id}`).send({}).set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(400);
	});
});

/*********************************************** DELETE /jobs/:id */

describe('DELETE /jobs/:id', function() {
	const job1 = {
		title: 'delete me',
		salary: 45000,
		equity: 0,
		company_handle: 'c1'
	};

	const failJob1 = {
		title: 'not going to work',
		salary: 49000,
		equity: 0.012,
		company_handle: 'c1'
	};

	const failJob2 = {
		title: 'not going to work again',
		salary: 49000,
		equity: 0.012,
		company_handle: 'c1'
	};

	test('works: ADMIN users ONLY', async function() {
		const job = await Job.createJob(job1);

		const resp = await request(app).delete(`/jobs/${job.id}`).set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(200);

		expect(resp.body).toEqual({ deleted: `${job.id}` });
	});

	test('FAIL: non-admin users => 401 error', async function() {
		const job = await Job.createJob(failJob1);

		const resp = await request(app).delete(`/jobs/${job.id}`).set('authorization', `Bearer ${u2Token}`);

		expect(resp.statusCode).toEqual(401);
	});

	test('FAIL: anon users => 401 error', async function() {
		const job = await Job.createJob(failJob2);

		const resp = await request(app).delete(`/jobs/${job.id}`);

		expect(resp.statusCode).toEqual(401);
	});

	test('FAIL: invalid id => 404 error', async function() {
		const resp = await request(app).delete('/jobs/12345').set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(404);
	});
});
```

- As a result of the lengthy testing, the coverage for the models and routes for all the mian files remained at 100% with the exacption being the logic setup under the `db.js` and the `ExpresError` files.

- The final request for Step IV was to update the `/companies/:handle` route to include `jobs` associated with them as an array collection which should look like the following

```JSON
{
	"handle": "test",
	"name": "test",
	"description": "testing description",
	"numEmployees": 300,
	"logoUrl": "https://www.google.com",
	"jobs" : "[
		{id, title, salary, equity},
		{id, title, salary, equity},
		...
	]"
}
```

- The approach I took was to go to the `company` model file and update the logic in the `get` method by adding a new query that retrieves data from the `jobs` table based on the `handle` passed in.

- Once the data has been retrieved, I added the row data under the `jobs` key and returned an object that contanied the `company` information and the `jobs` array that was returned from the second query. This now means that we no longer have to return an object in the `json` response.

```JS
// models/company.js

class Company{
	static async get(handle) {
		const companyRes = await db.query(
			`SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
			[ handle ]
		);

		/************************ NEW JOB QUERY */
		const job = await db.query(
			`
			SELECT
			id,
			title,
			salary,
			equity
			FROM jobs
			WHERE company_handle = $1
		`,
			[ handle ]
		);

		/************************ END NEW JOB QUERY */

		const company = companyRes.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		/************************ RETURN OBJECT WITH JOB ARRAY IF job.rows IS TRUTHY ELSE SET jobs TO [] */
		return { company, jobs: job.rows ? job.rows : [] };
	}
}
```

- The alternate that can be done with the above is to create a `LEFT JOIN` query and then data wrangle the response received from the db before sending the information to the frontend however, for the sake of time, I stuck with the two queries.

- Once the new logic was setup, the tests for the changes were updated as shown below.

```JS
// models/company.test.js
describe('get', function() {
	test('works', async function() {
		let company = await Company.get('c1');
		expect(company).toEqual({
			handle: 'c1',
			name: 'C1',
			description: 'Desc1',
			numEmployees: 1,
			logoUrl: 'http://c1.img',
			jobs: [
				{
					id: expect.any(Number),
					title: 'j1',
					salary: 30000,
					equity: '0'
				},
				{
					id: expect.any(Number),
					title: 'j2',
					salary: 40000,
					equity: '0.23'
				}
			]
		});
		expect(company.jobs).toBeTruthy();
	});


	/********************NEW TEST *********************/
	test('works: company with no jobs', async function() {
		let company = await Company.get('c2');

		expect(company.jobs.length).toEqual(0);
	});
	/********************NEW TEST *********************/

	test('not found if no such company', async function() {
		try {
			await Company.get('nope');
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});
```

```js
// routes/companies.test.js
describe('GET /companies/:handle', function() {
	test('works for anon', async function() {
		const resp = await request(app).get(`/companies/c1`);
		expect(resp.body).toEqual({
			handle: 'c1',
			name: 'C1',
			description: 'Desc1',
			numEmployees: 1,
			logoUrl: 'http://c1.img',
			/***UPDATED TEST FOR JOBS ARRAY ***/
			jobs: [
				{
					id: expect.any(Number),
					title: 'j1',
					salary: 34000,
					equity: '0.012'
				},
				{
					id: expect.any(Number),
					title: 'j2',
					salary: 40000,
					equity: null
				}
			]
			/***UPDATED TEST FOR JOBS ARRAY ***/
		});
	});
})
```

* [Back to Top](#table-of-contents)

---

## Part V

- Part V of this assignment had us implement a new route for users to apply to jobs and this step required two substeps.

	1. Create a `User` method that takes a `username` and a job `id` and add that information to the `applications` table which tracks jobs for users.

	2. Add a route under the `users` routes called `/users/:username/jobs/:id` which allows a logged in user or an admin to submit an application for a job.

		- In addition, once an application has been submitted to this route, the `json` response needs to be `{applied: id}`

	3. `/users/:username` route now needs to show the jobs that very user has applied to which just contains the `id` for that job via an array from the `json` response.

- First step that I took as described above, was to add the new `User` class method for sending data for a loggedin user to the backend table `applications`

```JS
// models/user.js

class User{
	/** Add a new application for a username and job_id
   * 
   * Expecting an object {username, job_id}
   * 
   * Returns {job_id}
   * 
   * If the username and job id already exist in the table (user already applied to the job), return BadRequestError
   */
	static async applyToJob({ username, id }) {
		const userCheck = await db.query(
			`
		  SELECT username
		  FROM users
		  WHERE username = $1
		`,
			[ username ]
		);

		if (userCheck.rows.length === 0) throw new NotFoundError(`Username: ${username} not found, please try again.`);

		const jobCheck = await db.query(
			`
		  SELECT id
		  FROM jobs
		  WHERE id = $1
		`,
			[ id ]
		);

		if (jobCheck.rows.length === 0) throw new NotFoundError(`Job id: ${id} not found, please try again.`);

		const duplicateCheck = await db.query(
			`SELECT username, job_id
       FROM applications
       WHERE username = $1 AND job_id = $2`,
			[ username, id ]
		);

		if (duplicateCheck.rows[0]) {
			throw new BadRequestError(`User already applied to job id: ${id}`);
		}

		const result = await db.query(
			`
      INSERT INTO applications
      (username, job_id)
      VALUES ($1, $2)
      RETURNING job_id AS "id"
    `,
			[ username, id ]
		);

		return { applied: result.rows[0].id };
	}
}
```

- The above solution is not as effecient in terms of Big-O for space but each query on the final `User` class method is explained below:

	- `userCheck` : Verifies that the user passed through the `url params` is a valid username in the backend db. If the query returns nothing, then a `NotFoundError` will be returned.

	- `jobCheck` : Verifies that the job `id` passed through the `url params` is a valid `id` in the backend db. If the query returns an empty rows array, then a `NotFoundError` is returned.

	- `duplicateCheck` : Ensures that a user cannot apply to the same job twice. If the result returned contains a valid array with data, then a `BadRequestError` is returned.

	- `result` : Returns an object => `{applied : id}` if the previous checks don't return any errors meaning that this is a valid application. The object returned is the job `id` which will be seen on the frontend.

- Once the class method was created, I created the route for users or admins to apply to jobs that are available.

```JS
// routes/users.js

router.post('/:username/jobs/:id', checkUserOrAdmin, async function(req, res, next) {
	try {
		if (isNaN(req.params.id)) throw new BadRequestError('Invalid job id');

		let { username, id } = req.params;

		id = +id;

		const application = await User.applyToJob({ username, id });

		return res.json(application);
	} catch (err) {
		return next(err);
	}
});
```

- The solution above is using the `checkUserOrAdmin` middleware function to ensure that logged in users or admins can submit applications for jobs that are available.

- If the middelware function passes, then the route handler function will first check to ensure that the `id` value from the `req.params` object is equal to `NaN` which is what the `isNaN` method is doing. The method returns `true` if the value within the method is `NaN` (invalid id) and if that is the case, then the user will see a `BadRequestError` on the frontend.

- If the `NaN` method returns `false`, the route handler function will de-structure the `username` and `id` properties from the `req.params` object from the `url`.

- After that is done, we turn the `id` property into an `integer` using unary operator `+id`.

- Final step is making the call to the backend query through the `User` class method `applyToJob` passin in the `username` and `id` variables and we return the `json` response which is `{applied: jobId}`.

- The final update was to the the `/users/:username` route which now needs to return `{..., jobs: [jobId, jobId, ...]}` for individual user views.

- Just like the previous examples above, I started with the `User` class and updated the logic of the `get` method which will also make a separate query to the backend `applications` table matching application information based on `username` which is what the `get` method is using.

- The return value is now returning an object which will contain `{user, jobs}` where `jobs` is an array of job ids.

```JS
// models/user.js

class User{
	static async get(username) {
		const userRes = await db.query(
			`SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
			[ username ]
		);

		const jobRes = await db.query(
			`
      SELECT job_id AS "id"
      FROM applications
      WHERE username = $1
    `,
			[ username ]
		);

		const jobs = jobRes.rows.map((row) => row.id);

		const user = userRes.rows[0];

		if (!user) throw new NotFoundError(`No user: ${username}`);

		return { user, jobs };
	}

}
```

- As pointed out above, the array of jobs returned is first mapped from the `jobRes.rows` object array and we use `map` method to create the array of jobs and if there is nothing returned for that user, then we will see `jobs: []` in the return object.

- With the update made to the `User` class, the `/users/:username` route needed to be slightly modified to just return the response from the class method since we are returning an object to begin with.

```JS
// routes/user.js

router.get('/:username', checkUserOrAdmin, async function(req, res, next) {
	try {
		const user = await User.get(req.params.username);
		return res.json(user); // ---> this is the updated line :)
	} catch (err) {
		return next(err);
	}
});
```

- With the final update now completed, we move on to the final testing!

### Testing:

- Testing began just like the final step which is with testing the `User` model and update the tests for the `static methods` as shown below.

```JS
// models/user.test.js

/************************************** get */

describe('get', function() {
	test('works', async function() {
		let user = await User.get('u1');
		expect(user).toEqual({
			username: 'u1',
			firstName: 'U1F',
			lastName: 'U1L',
			isAdmin: false,
			jobs: [] // ---> this is the updated line :)
		});
	});
});

/************************************** applyToJob */

describe('applyToJob', function() {
	const testUser = {
		username: 'testDiego',
		password: 'notpassword',
		firstName: 'Diego?',
		lastName: 'Maybe?',
		email: 'testingAgain@test.com',
		isAdmin: true
	};

	const testUser2 = {
		username: 'testDiego2',
		password: 'notpassword',
		firstName: 'Diego?!',
		lastName: 'Maybe?!',
		email: 'testingAgainnn@test.com',
		isAdmin: false
	};

	const testJob = {
		title: 'diegoYob',
		salary: 90000,
		equity: 0.012,
		company_handle: 'c2'
	};

	const failJ1 = {
		title: 'diegoYob2',
		salary: 90000,
		equity: 0.01,
		company_handle: 'c1'
	};

	test('works', async function() {
		let user = await User.register(testUser);
		let username = user.username;
		let job = await Job.createJob(testJob);

		const resp = await User.applyToJob({ username, id: job.id });

		expect(resp).toEqual({ applied: expect.any(Number) });
	});

	test('FAIL: invalid username', async function() {
		let job = await Job.createJob(failJ1);
		let username = 'nahcuh';

		try {
			await User.applyToJob({ username, id: job.id });
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('FAIL: invalid job id', async function() {
		let id = 9999999;
		let username = await User.register(testUser2);

		try {
			await User.applyToJob({ username, id });
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('FAIL: duplicate job application', async function() {
		let user = await User.register(testUser);
		let username = user.username;
		let job = await Job.createJob(testJob);

		try {
			await User.applyToJob({ username, id: job.id });
			await User.applyToJob({ username, id: job.id });
			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});
```

- Once the tests for the model were completed, I moved on to the route tests with updates and additions on the new route. 

- As a note, the tests above __DON'T__ have tests for invalid data, this is because those checks are happening on the route hadnler functions for the `id` passed through the params. The `User` method is processing the invalid username and returning the error as shown above.

```JS
// routes/jobs.test.js
/************************************** POST /users/:username/jobs/:id */

describe('POST /users/:username/jobs/:id', function() {
	test('works: ADMIN user for self', async function() {
		const job = await Job.createJob({ title: 'job1', salary: 30000, equity: 0.09, company_handle: 'c2' });
		const resp = await request(app).post(`/users/u1/jobs/${job.id}`).set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({ applied: job.id });
	});

	test('works: application submitted for differnet user AS ADMIN', async function() {
		const job = await Job.createJob({ title: 'job2', salary: 30000, equity: 0.09, company_handle: 'c1' });
		const resp = await request(app).post(`/users/u2/jobs/${job.id}`).set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({ applied: job.id });
	});

	test('works: NON-ADMIN application for same username', async function() {
		const job = await Job.createJob({ title: 'job3', salary: 33000, equity: 0.09, company_handle: 'c1' });
		const resp = await request(app).post(`/users/u2/jobs/${job.id}`).set('authorization', `Bearer ${u2Token}`);

		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({ applied: job.id });
	});

	test('FAIL: non-admin application for admin user => 401 error', async function() {
		const job = await Job.createJob({ title: 'job4', salary: 37000, equity: 0.09, company_handle: 'c3' });
		const resp = await request(app).post(`/users/u1/jobs/${job.id}`).set('authorization', `Bearer ${u2Token}`);

		expect(resp.statusCode).toEqual(401);
	});

	test('FAIL: anon user application for registered user => 401 error', async function() {
		const job = await Job.createJob({ title: 'job5', salary: 37000, equity: 0.013, company_handle: 'c3' });
		const resp = await request(app).post(`/users/u1/jobs/${job.id}`);

		expect(resp.statusCode).toEqual(401);
	});

	test('FAIL: invalid username => 404 error', async function() {
		const job = await Job.createJob({ title: 'job1', salary: 30000, equity: 0.09, company_handle: 'c2' });
		const resp = await request(app).post(`/users/nah_son/jobs/${job.id}`).set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(404);
		expect(resp.body).toEqual({
			error: { message: 'Username: nah_son not found, please try again.', status: 404 }
		});
	});

	test('FAIL: invalid job id => 400 error', async function() {
		const resp = await request(app).post(`/users/u1/jobs/nope_again`).set('authorization', `Bearer ${u1Token}`);

		expect(resp.statusCode).toEqual(400);
		expect(resp.body).toEqual({
			error: { message: 'Invalid job id', status: 400 }
		});
	});
});
```

* [Back to Top](#table-of-contents)

---

## Final:

- With the final tests now written, the application requirements are now completed!

- As a short wrap up, the requirements were as follows:

	- Document `sqlForPartialUpdate` method under `helpers/sql.js`.

	- Setup filtering for main `/companies` `GET` route so __ALL__ users can filter results within the query string.

		- Filtering options are `name` , `minEmployees` , and `maxEmployees`

		- Filtering should be done via `models/company.js` based on object passed in from query string.

		- Write tests for new code logic added and update previous tests that were in place.

	- Add authorization for creating, updating, and deleting companies from the backend databse for admin type users __ONLY__.

		- Update / add new tests for new logic introduced for authorization on `/companies` routes for `POST` , `PATCH` , and `DELETE` methods.

	- Add authorization for creating, viewing all users, updating, and deleting users from the backend database for admin type users __ONLY__.

		- `PATCH` / `GET` / `DELETE` methods should be allowed by that very user OR an admin type user.

		- Update and create new tests to ensure that these new features are working as intended.

	- Add Job model, routes, and tests.
		
		- Setup new file under `models` directory for the `job.js` file.

			- Setup `static` methods for new `Job` class.

		- Setup new route file under `routes` directory for the `jobs.js` file.

			- Setup routes for `/jobs` routes similary to the `/companies` route.

		- Add filtering for jobs to filter on the criteria below:

			- `title`, `minSalary`, `hasEquity`

		- Ensure that ONLY the data needed is passed in through new json schema files under the `schemas` directory for adding or updating or filtering job entries.

		- Show jobs for a company such as `{handle, name, ... jobs: [{id, title, salary, hasEquity}, ...]}`

		- Write new tests for all code introduced to application.

	- Create new route for users to submit applications for a `job id`.

		- New route is called `/users/:username/jobs/:id` and must send data via `POST` request.

			- Users can submit applications for themselves.
			
			- Admin users can submit applications for themselves as well OR other non-admin users.

			- Non-admin users CANNOT submit applications for other users.

			- Add new `static` method for `User` class to allow job applications from new route defined.

				- return `{applied: jobId}` from new route.

			- Update `get` method under `User` class so array of `jobId` is returned such as `{username, firstName, lastName, ... jobs: [jobId, jobId, ...]}`

			- Write new tests and update previous tests to ensure new logic is being recognized accordingly with new data returned from updated route / static method.

- __NOTE :__ The final report is listed below. The main takeaway that I want to point out is tha the yellow lines are not uncovered necessarily, BUT instead it's logic that is not entirely tested. I cannot think of what was missed directly as the `routes` report is stating perfect coverage. Each of the highlighted rows is listed below.

![coverage-report](/imgs/Broken_App2_Coverage%20Report_FINAL.png)


```JS
// models/user.js LINE 241
if (jobCheck.rows.length === 0) throw new NotFoundError(`Job id: ${id} not found, please try again.`);

// models/user.test.js
	test('FAIL: invalid job id', async function() {
		let id = 9999999;
		let username = await User.register(testUser2);

		try {
			await User.applyToJob({ username, id });
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});


// models/company.js LINE 142

		return {
			handle: company.handle,
			name: company.name,
			description: company.description,
			numEmployees: company.numEmployees,
			logoUrl: company.logoUrl,
			jobs: job.rows ? job.rows : [] // <--- LINE 142
		};

// models/company.test.js 
	test('works: company with no jobs', async function() {
		let company = await Company.get('c2');

		expect(company.jobs.length).toEqual(0);
	});

// db.js
  db = new Client({
    connectionString: getDatabaseUri(), // <--- LINE 9
    ssl: {
      rejectUnauthorized: false
    }
  });

// expressError.js
class ForbiddenError extends ExpressError {
  constructor(message = "Bad Request") {
    super(message, 403); // <--- LINE 43
  }
}
```

* [Back to Top](#table-of-contents)

---