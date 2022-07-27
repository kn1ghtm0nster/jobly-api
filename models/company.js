'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

/** Related functions for companies. */

class Company {
	/** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

	static async create({ handle, name, description, numEmployees, logoUrl }) {
		const duplicateCheck = await db.query(
			`SELECT handle
           FROM companies
           WHERE handle = $1`,
			[ handle ]
		);

		if (duplicateCheck.rows[0]) throw new BadRequestError(`Duplicate company: ${handle}`);

		const result = await db.query(
			`INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
			[ handle, name, description, numEmployees, logoUrl ]
		);
		const company = result.rows[0];

		return company;
	}

	/** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

	static async findAll(query = {}) {
		let baseQuery = `
    SELECT handle,
          name,
          description,
          num_employees AS "numEmployees",
          logo_url AS "logoUrl"
    FROM companies`;

		// setting where clauses to an array depending on the filter options entered through the query string.
		let where = [];
		// setting values for the where clauses depending on the filter options through the query string.
		let vals = [];

		// destructuring the options from the query object received to build the where and vals arrays.
		const { name, minEmployees, maxEmployees } = query;

		// if the minEmployees property is higher than the maxExmployees property, return new error for the user to view on the API frontend.
		if (minEmployees > maxEmployees) {
			throw new BadRequestError('minEmployees cannot be higher than maxEmployees');
		}

		// build where clause for minEmployees and add the value of that clause to the vals array which contains all the sanitized inputs to build the final query.
		if (minEmployees !== undefined) {
			vals.push(minEmployees);
			where.push(`num_employees >= $${vals.length}`);
		}

		// build where clause for maxEmployees and add the value of that clause to the vals array which contains all the sanitized inputs to build the final query.
		if (maxEmployees !== undefined) {
			vals.push(maxEmployees);
			where.push(`num_employees <= $${vals.length}`);
		}

		// if the name property exists, push the value to the vals array and add the additional where clause to filter by company names similar to the name entered (case insensitive which is why ILIKE was used).
		if (name) {
			vals.push(`%${name}%`);
			where.push(`name ILIKE $${vals.length}`);
		}

		// building the final part of the query with the where array clauses joining each element within by an AND statement.
		if (where.length > 0) {
			baseQuery += ' WHERE ' + where.join(' AND ');
		}

		// setting the query to be ordered by company name.
		baseQuery += ' ORDER BY name';

		// calling the query to the backend db with the query built and using the vals array as the values to enter on the query to return those rows only.
		const companiesRes = await db.query(baseQuery, vals);
		return companiesRes.rows;
	}

	/** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

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

		const company = companyRes.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		return {
			handle: company.handle,
			name: company.name,
			description: company.description,
			numEmployees: company.numEmployees,
			logoUrl: company.logoUrl,
			jobs: job.rows ? job.rows : []
		};
	}

	/** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

	static async update(handle, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			numEmployees: 'num_employees',
			logoUrl: 'logo_url'
		});
		const handleVarIdx = '$' + (values.length + 1);

		const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
		const result = await db.query(querySql, [ ...values, handle ]);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		return company;
	}

	/** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

	static async remove(handle) {
		const result = await db.query(
			`DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
			[ handle ]
		);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);
	}
}

module.exports = Company;
