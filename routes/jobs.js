'use strict';

/** Routes for users. */

const jsonschema = require('jsonschema');

const express = require('express');
const { ensureAdmin } = require('../middleware/auth');
const { BadRequestError } = require('../expressError');
const Job = require('../models/job');

const jobFilterSchema = require('../schemas/jobFilterSchema.json');
const newJobSchema = require('../schemas/newJobSchema.json');
const jobUpdateSchema = require('../schemas/jobUpdateSchema.json');

const router = express.Router();

/** GET / => 
 * {jobs: [{id, title, salary, equity, companyHandle}, ...]}
 * 
 * Can filter on provided search filters:
 * - title (STR)
 * - minSalary (INT)
 * - hasEquity (BOOL)
 * 
 * Authorization required: none
 */

router.get('/', async function(req, res, next) {
	const query = req.query;
	if (query.minSalary !== undefined) query.minSalary = +query.minSalary;

	try {
		// validate
		const validator = jsonschema.validate(query, jobFilterSchema);

		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const jobs = await Job.allJobs(query);
		return res.json({ jobs });
	} catch (err) {
		return next(err);
	}
});

/**GET /:id  => {job} 
 * 
 * Job is {id, title, salary, equity, companyHandle}
 * 
 * Authorization required: none
 * 
*/

router.get('/:id', async function(req, res, next) {
	try {
		const job = await Job.get(req.params.id);
		return res.json({ job });
	} catch (err) {
		return next(err);
	}
});

/** POST / {job} => {job} 
 * 
 * data should be {title, salary, equity, company_handle}
 * 
 * Returns {id, title, salary, equity, companyHandle}
 * 
 * Throws error if data missing from newCompanySchema
 * 
 * Authorization required: Admin ONLY
 */

router.post('/', ensureAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, newJobSchema);

		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const job = await Job.createJob(req.body);
		return res.status(201).json({ job });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /:id {update1, update2, update3} => {job} 
 * 
 * Patches job information.
 * 
 * fields can be {title, salary, equity}
 * 
 * Returns {id, title, salary, equity, companyHandle}
 * 
 * Authorization required: Admins ONLY
 * 
*/

router.patch('/:id', ensureAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, jobUpdateSchema);

		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const job = await Job.update(req.params.id, req.body);
		return res.json({ job });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /:id => {deleted: id} 
 * 
 * Authorization: Admin ONLY
 * 
*/

router.delete('/:id', ensureAdmin, async function(req, res, next) {
	try {
		await Job.delete(req.params.id);
		return res.json({ deleted: req.params.id });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
