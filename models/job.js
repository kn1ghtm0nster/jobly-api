'use strict';

const db = require('../db');

const { NotFoundError, BadRequestError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

/* Related functions for jobs. */

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

module.exports = Job;
