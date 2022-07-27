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
