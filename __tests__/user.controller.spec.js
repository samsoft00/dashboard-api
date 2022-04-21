const superAgent = require('supertest');
const app = require('../src/app')
const { account, fakeIp } = require('./setup')

// console.log(account)
describe("User", () => {
    let request = null;
    let server = null;

    beforeAll(function(done){       
      server = app.listen(done);
      request = superAgent.agent(server);      
    });

    afterAll(function(done){ server.close(done); });
    
    //UserController Test suites
    // Register user
    //1. throw error if email not valid
    //2. throw error if phone is not 11 character
    // 3. Depertment ID must be a number and most exist
    // 4. username must be 3 character above
    // 5. return success on register

    describe("Create New User", () => {
        it("throw error if email is not valid", async done => {
            await request
                .post('/api/v1/user/register')
                .set({'x-real-ip': fakeIp})
                .send({ ...account, email: 'dodo.gmail.com' })
                .expect((res) => {
                    expect(res.status).toBe(400);
                    expect(res.body.message).toMatch(/invalid email address/);   
                    
                    done();
                });
        })

        it("throw error if phone number is not 11 character", async () => {
            const r = await request
                .post('/api/v1/user/register')
                .set('x-real-ip', fakeIp)
                .send({...account, phone_number: '203922217xu'});

            expect(r.status).toBe(400);
            expect(r.body.message).toMatch(/Invalid phone number/);
        })

        it("depertment ID must be a number and most exist", async () => {
            const r = await request
                .post('/api/v1/user/register')
                .set('x-real-ip', fakeIp)
                .send({...account, department_id: 100});

            expect(r.status).toBe(400);
            expect(r.body.message).toMatch(/Invalid department ID/);
        })

        it("username must be atleast 6 character long", async () => {
            const r = await request
                .post('/api/v1/user/register')
                .set('x-real-ip', fakeIp)
                .send({...account, username: '0x07'});

            expect(r.status).toBe(400);
            expect(r.body.message).toMatch(/Username is required/);           
        })

        it("success on register", async () => {
            const r = await request
                .post('/api/v1/user/register')
                .set('x-real-ip', fakeIp)
                .send(account);

            expect(r.status).toBe(200);
            expect(r.body).toHaveProperty('data');
            expect(r.body.message).toMatch(/successful/);

            Object.assign(account, { ...r.body.data});
        })

        // it("throw error if user already register", async () => {
        //     console.log(account);
        // })
    })
})