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
