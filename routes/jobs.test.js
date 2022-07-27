'use strict';

const request = require('supertest');

const db = require('../db');
const app = require('../app');
const Job = require('../models/job');

const {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	u1Token,
	u2Token
} = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

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
					companyHandle: 'c1'
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
