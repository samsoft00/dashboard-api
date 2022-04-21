const superAgent = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const { fakeIp, account, users, applicantData, businessEmpl, bankDetails } = require('./setup');
const applicantID = crypto.randomUUID;

describe("Loan Applicant", () => {
    let request, server = null;

    beforeAll(function(done){
      server = app.listen(done);
      request = superAgent.agent(server);
    });

    afterAll(function(done){ server.close(done) });
   
    describe("Create New Applicant", () => {
        /**
         * 3. throw error if bvn not valid
         * 4. throw error if date_issued > expiry_date_issued
         * 1. should be able to create new applicant
         * 1. throw error if user phone number email already exist
         * 2. throw error if email already exist
         * 3. throw error if BVN already exist
         */

         it("throw error if bvn not valid", async () => {
            await request
                .post('/api/v1/applicant')
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send({ ...applicantData, bvn: '382933333v1' })
                .expect(res => {
                    expect(res.status).toEqual(400)
                    expect(res.body.message).toMatch(/Invalid BVN number/)
                });
         });

         it("throw error if date_issued > expiry_date_issued", async () => {
            await request
                .post('/api/v1/applicant')
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send({ ...applicantData, date_issued: '2020-01-12', expiry_date_issued: '2019-08-12' })
                .expect(res => {
                    expect(res.status).toEqual(400)
                    expect(res.body.message).toMatch(/Expiry date issued must be greater than issued date/)
                });             
         })

         it("should be able to create new applicant", async () => {
            const res = await request
                .post('/api/v1/applicant')
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send(applicantData);

            expect(res.status).toEqual(200);
            expect(res.body.message).toMatch(/successful/);
                
            Object.assign(applicantData, { ...res.body.data });
         });

         it("throw error if phone number already exist", async () => {
            const res = await request
                .post('/api/v1/applicant')
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send({ ...applicantData, phone_number: '07023437899' });

            expect(res.status).toEqual(400);
            expect(res.body.message).toMatch(/Applicant with name, phone number or bvn exists/);                
         });

         it("throw error if email already exist", async () => {
            const res = await request
                .post('/api/v1/applicant')
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send({ ...applicantData, email: 'lynch.albin@neocede.ml' });

            expect(res.status).toEqual(400);
            expect(res.body.message).toMatch(/Applicant with name, phone number or bvn exists/);             
         });
         
         it("throw error if BVN already exist", async () => {
            const res = await request
                .post('/api/v1/applicant')
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send({ ...applicantData, bvn: '78302229302' });

            expect(res.status).toEqual(400);
            expect(res.body.message).toMatch(/Applicant with name, phone number or bvn exists/);                          
         });
    });

    // {{host}}/api/v1/applicant/:applicant_id/employment
    describe("Add business/employment", () => {
        /**
         * 1. Throw error if applicant ID is not valid
         * 2. check Business/employment type ID
         * 3. should be able to add business/employment
         */

        it("throw error if applicant ID is not valid", async () => {
            
            await request
                .post(`/api/v1/applicant/${applicantID}/employment`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send(businessEmpl)
                .expect(res => {
                    expect(res.status).toEqual(400);
                    expect(res.body.message).toMatch(/Applicant not found!/);                    
                });           
        });

        it("ensure Business/employment type ID", async () => {

            await request
                .post(`/api/v1/applicant/${applicantData.id}/employment`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send({ ...businessEmpl, business_employment_type_id: 30 })
                .expect(res => {
                    expect(res.status).toEqual(400);
                    expect(res.body.message).toMatch(/not found/);                    
                });             
        });

        it("should be able to add business/employment", async () => {
            const loanCreators = users.filter(user => ['LOAN_OFFICER', 'LOAN_SUPERVISOR'].includes(user.department.slug));

            await request
                .post(`/api/v1/applicant/${applicantData.id}/employment`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanCreators[0].access_token}` })
                .send(businessEmpl)
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);                    
                    expect(res.body).toHaveProperty("data");

                    Object.assign(businessEmpl, {id: res.body.data.id});
                });
        });

    });

    describe("Add bank details", () => {
        /**
         * 1. should be able to add bank details
         */

        it("should be able to add bank details", async () => {
            const loanCreators = users.filter(user => ['LOAN_OFFICER', 'LOAN_SUPERVISOR'].includes(user.department.slug));

            await request
                .post(`/api/v1/applicant/${applicantData.id}/bank_details`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanCreators[0].access_token}` })
                .send(bankDetails)
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);                    
                    expect(res.body).toHaveProperty("data");

                    Object.assign(bankDetails, {id: res.body.data.id});
                });            
        });
    });
});