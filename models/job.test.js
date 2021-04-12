"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */
describe("create", function () {
    let newJob = {
        company_handle: "c1",
        title: "myTitle",
        salary: 9999,
        equity: "0.1",
    };

    test("works", async function () {
      let job = await Job.create(newJob);
      expect(job).toEqual({
          id: expect.any(Number),
          title: 'myTitle',
          salary: 9999,
          equity: '0.1',
          companyHandle: 'c1'
      })
    });
  
    test("bad request with dupe", async function () {
        try {
            await Job.create(newJob);
            await Job.create(newJob);
        } catch (err) {
          expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
 
});

/************************************** findAll */

describe('findAll', async function () {

    test('works: no filter', async function () {
      let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: 1,
        title: 't1',
        salary: 100,
        equity: "0.1",
        companyHandle: 'c1',
        name: 'C1',
      },
      {
        id: 2,
        title: 't2',
        salary: 200,
        equity: "0.2",
        companyHandle: 'c2',
        name: 'C2',
      },
      {
        id: 3,
        title: 't3',
        salary: 300,
        equity: "0.3",
        companyHandle: 'c3',
        name: 'C3',
      },
    ]);
  });

  test('works: title', async function (){
    let jobs = await Job.findAll({ title: '1' });
    
    expect(jobs).toEqual([
      {
        id: 1,
        title: 't1',
        salary: 100,
        equity: "0.1",
        companyHandle: 'c1',
        name: 'C1',
      },
    ])
  });

  test('works: minSalary', async function (){
    let jobs = await Job.findAll({ minSalary: 300 });
    expect(jobs).toEqual([
      {
        id: 3,
        title: 't3',
        salary: 300,
        equity: "0.3",
        companyHandle: 'c3',
        name: 'C3',
      },
    ])
  });

  test('works: equity', async function (){
    let jobs = await Job.findAll({ hasEquity: true });
    expect(jobs).toEqual([
      {
        id: 1,
        title: 't1',
        salary: 100,
        equity: "0.1",
        companyHandle: 'c1',
        name: 'C1',
      },
      {
        id: 2,
        title: 't2',
        salary: 200,
        equity: "0.2",
        companyHandle: 'c2',
        name: 'C2',
      },
      {
        id: 3,
        title: 't3',
        salary: 300,
        equity: "0.3",
        companyHandle: 'c3',
        name: 'C3',
      },
    ])
  });

  test('works: minSalary and title', async function (){
    let jobs = await Job.findAll({ title: '2', minSalary: 100 });
    expect(jobs).toEqual([
      {
        id: 2,
        title: 't2',
        salary: 200,
        equity: "0.2",
        companyHandle: 'c2',
        name: 'C2',
      },
    ])
  });

  test('works: all filters', async function (){
    let jobs = await Job.findAll({ title: '1', minSalary: 100, hasEquity: true });
    expect(jobs).toEqual([
      {
        id: 1,
        title: 't1',
        salary: 100,
        equity: "0.1",
        companyHandle: 'c1',
        name: 'C1',
      },
    ])
  });
});

/*********************** get */

describe('get', function () {

  test('works', async function () {
    let job = await Job.get(1);
    expect(job).toEqual({
        id: 1,
        title: 't1',
        salary: 100,
        equity: "0.1",
        company: {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
    });
  });

  test('NotFoundError() if job does not exist', async function () {
    try {
      await Job.get(999); 
    } catch (e) {
      expect(e instanceof NotFoundError).toBeTruthy();
    }
  });
});

/********************** Update */

describe('Update', function (){

  test('works', async function () {
    let job = await Job.update(1, { title: "newT1" });
    expect(job).toEqual({
      id: 1,
      title: 'newT1',
      salary: 100,
      equity: "0.1",
      companyHandle: 'c1',
    })
  })

  test('NotFoundError() if job does not exist', async function () {
    try {
      await Job.get(999); 
    } catch (e) {
      expect(e instanceof NotFoundError).toBeTruthy();
    }
  });

  test('Bad request for no data', async function () {
    try {
      await Job.update(1, {}); 
    } catch (e) {
      expect(e instanceof BadRequestError).toBeTruthy();
    }
  });
})

/********************** Delete */

describe('Delete', function () {

  test('works', async function () {
    await Job.remove(1);
    const result = await db.query(
        "SELECT id FROM jobs WHERE id=$1", [1]);
    expect(result.rows.length).toEqual(0);
  });

  test('NotFoundError() if job does not exist', async function () {
    try {
      await Job.remove(999); 
    } catch (e) {
      expect(e instanceof NotFoundError).toBeTruthy();
    }
  });

  test('Bad request for bad data', async function () {
    try {
      await Job.remove("bad data"); 
    } catch (e) {
      expect(e instanceof BadRequestError).toBeFalsy();
    }
  });
});
