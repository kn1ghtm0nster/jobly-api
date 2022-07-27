'use strict';

const { NotFoundError, BadRequestError } = require('../expressError');
const db = require('../db.js');
const Job = require('./job');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll } = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************ create */

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
				companyHandle: 'c1'
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
				companyHandle: 'c1'
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
				companyHandle: 'c1'
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
			{ id: expect.any(Number), title: 'j2', salary: 40000, equity: '0.23', companyHandle: 'c1' },
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
			company_handle: 'c2'
		};
		let newJob = await Job.createJob(testJob);

		const results = await Job.get(newJob.id);

		expect(results).toEqual({
			id: expect.any(Number),
			title: 'getThis',
			salary: 40000,
			equity: '0.2',
			companyHandle: 'c2'
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
