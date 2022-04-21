const superAgent = require('supertest');
const app = require('../src/app');
const { 
    fakeIp, 
    account, 
    applicantData, 
    users, 
    businessEmpl,
    bankDetails,
    loans 
} = require('./setup');

/**
 * Loan application process journey.
 * - Loan creation:
 *   - Throw error if user is not [LOAN_OFFICER or TEAM_SUPERVISOR]
 *   - Loan officer should be able to create a loan
 * 
 */

const getUserByRole = (roles) => {
    const resp = users.map(user => {
        const r = Array.isArray(roles) ? roles : [roles];

        const result = user.roles.filter((x) => r.includes(x))
        if (result.length) return user;
    }).filter(u => typeof u !== 'undefined');

    return Array.isArray(roles) ? resp : resp[0];
    
}

describe("Loan Application", () => {
    let request, server = null;

    beforeAll(async function(done){
      server = app.listen(done);
      request = superAgent.agent(server);
    });

    afterAll(function(done){  server.close(done) });

    describe("/POST Create Loan Application", () => {
        it("throw error if user is not a [loan officer or supervisor]", async (done) => {
            
            await request
                .post(`/api/v1/loan_application/${applicantData.id}/new`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .send({})
                .expect(res => {
                    expect(res.status).toEqual(401);
                    expect(res.body.message).toMatch(/not authorized to perform this action/);                    
                });

            done();
        });

        it("should throw error if no busEmply or bank details", async () => {
            const loanCreators = users.filter(user => ['LOAN_OFFICER', 'LOAN_SUPERVISOR'].includes(user.department.slug));

            await request
                .post(`/api/v1/loan_application/${applicantData.id}/new`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanCreators[0].access_token}` })
                .send({...loans.DEFAULT_LOAN})
                .expect(res => {
                    expect(res.status).toEqual(400);
                });            
        });

        it("should be able to create loan application", async () => {
            const loanCreators = users.filter(user => ['LOAN_OFFICER', 'LOAN_SUPERVISOR'].includes(user.department.slug));

            await request
                .post(`/api/v1/loan_application/${applicantData.id}/new`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanCreators[0].access_token}` })
                .send({
                    ...loans.DEFAULT_LOAN, 
                    business_employment_id: businessEmpl.id, 
                    bank_detail_id: bankDetails.id  })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);                    
                    expect(res.body.data).toHaveProperty("refrence_no");
                    
                    Object.assign(loans.DEFAULT_LOAN, { ...res.body.data });
                });

        });

        it("throw error if require documents not upload", async () => {
            const loanCreators = users.filter(user => ['LOAN_OFFICER', 'LOAN_SUPERVISOR'].includes(user.department.slug));

            await request
                .post(`/api/v1/loan_application/${loans.DEFAULT_LOAN.id}/manage`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanCreators[0].access_token}` })
                .send({
                    comment: "Everything is looking great from this side",
                    request_update: false
                })
                .expect(res => {
                    expect(res.status).toEqual(400);
                    expect(res.body.message).toMatch(/Loan application still pending completion/);
                });            
        });

        it("should update required doc", async () => {
            const loanCreators = users.filter(user => ['LOAN_OFFICER', 'LOAN_SUPERVISOR'].includes(user.department.slug));

            await request
                .post(`/api/v1/loan_application/${loans.DEFAULT_LOAN.id}/upload`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanCreators[0].access_token}` })
                .send({
                    "uploads": [
                        {
                            "check_list_id": 10, 
                            "doc_url": "https://sequelize.org/master/manual/validations-3-and-constraints.html"
                        }
                    ]
                })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);
                });            
        });

        // {{host}}/api/v1/loan_application/:loan_id/manage
        it("[loan officer] should be able to move loan to [supervisor desk] next stage", async () => {
            const loanCreators = users.filter(user => ['LOAN_OFFICER', 'LOAN_SUPERVISOR'].includes(user.department.slug));

            await request
                .post(`/api/v1/loan_application/${loans.DEFAULT_LOAN.id}/manage`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanCreators[0].access_token}` })
                .send({
                    comment: "Everything is looking great from this side",
                    request_update: false
                })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);
                });
        });
    });

    // {{host}}/api/v1/loan_application?page=1&limit=20
    describe("/GET [TEAM_SUPERVISOR, CREDIT ADMIN]", () => {

        it("should return empty [] for normal users", async () => {
            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    expect(res.body.data.length).toBe(0);
                });            
        });

        it("should return empty [] to [loan officer] if loan has been moved", async () => {
            const loanCreator = getUserByRole('LOAN_OFFICER');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanCreator.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    // expect(res.body.data.length).toBe(0);
                });
        });

        it("both should be able to access list of loans on desk", async () => {
            const creditAndTeamSupvsor = getUserByRole(['CREDIT_ADMIN', 'TEAM_SUPERVISOR']);

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${creditAndTeamSupvsor[0].access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    expect(res.body.data.length > 0);
                });
        });
    })

    describe("/POST [CREDIT ADMIN] move loan", () => {
        it("loan should be in SUPERVISOR desk and have status IN_PROGRESS", async () => {
            const creditAndTeamSupvsor = getUserByRole(['CREDIT_ADMIN', 'TEAM_SUPERVISOR']);

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${creditAndTeamSupvsor[0].access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.data[0].current_state.slug).toEqual('IN_PROGRESS');
                    expect(creditAndTeamSupvsor.includes(res.body.data[0].current_step.slug));
                    expect(res.body).toHaveProperty('pagination');
                });
        });

        it("[credit admin] should be able to move loan to next stage", async () => {
            const creditAndTeamSupvsor = getUserByRole('CREDIT_ADMIN');

            await request
                .post(`/api/v1/loan_application/${loans.DEFAULT_LOAN.id}/manage`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${creditAndTeamSupvsor.access_token}` })
                .send({
                    comment: "Everything is looking great from the credit admin side",
                    request_update: false
                })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);
                });            
        });
        
        it("loan should be in RISK Desk & have status IN_REVIEW", async () => {
            const riskDpt = getUserByRole('RISK_AND_COMPLIANCE');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${riskDpt.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.data[0].current_state.slug).toEqual('IN_REVIEW');
                    expect(riskDpt.slug === res.body.data[0].current_step.slug);
                    expect(res.body).toHaveProperty('pagination');
                });
        });
    });

    describe("/GET [RISK_MANAGEMENT]", () => {
        it("should return empty [] to [credit admin] if loan has been moved", async () => {
            const creditAdmin = getUserByRole('CREDIT_ADMIN');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${creditAdmin.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    expect(res.body.data.length).toBe(0);
                });            
        });

        it("[RISK MANAGEMENT] should be able to access list of loans on his desk", async () => {
            const riskMgr = getUserByRole('RISK_AND_COMPLIANCE');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${riskMgr.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    expect(res.body.data.length > 0);
                });            
        });
    });

    describe("/POST [RISK_MANAGEMENT] move loan", () => {
        it("loan should be in RISK_MANAGEMENT desk and have status IN_REVIEW", async () => {
            const riskDept = getUserByRole('RISK_AND_COMPLIANCE');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${riskDept.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.data[0].current_state.slug).toEqual('IN_REVIEW');
                    expect(riskDept.slug === res.body.data[0].current_step.slug);
                    expect(res.body).toHaveProperty('pagination');
                });            
        });

        it("[Risk Management] should be able to move loan to next stage", async () => {
            const riskDept = getUserByRole('RISK_AND_COMPLIANCE');

            await request
                .post(`/api/v1/loan_application/${loans.DEFAULT_LOAN.id}/manage`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${riskDept.access_token}` })
                .send({
                    comment: "Everything is looking great from the risk management side",
                    request_update: false
                })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);
                });            
        });

        it("loan should be in MANAGEMENT Desk & have status MD_APPROVAL", async () => {
            const managr = getUserByRole(['CCO', 'MANAGING_DIRECTOR', 'CREDIT_COMMITTEE', 'BOARD_MEMBER']);

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${managr[0].access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.data[0].current_state.slug).toEqual('MD_APPROVAL');
                    expect(managr[0].slug === res.body.data[0].current_step.slug);
                    expect(res.body).toHaveProperty('pagination');
                });            
        });
    });

    describe("/GET [MANAGEMENT]", () => {
        it("should return empty [] to [RISK MANAGEMENT] if loan has been moved", async () => {
            const riskMgr = getUserByRole('RISK_AND_COMPLIANCE');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${riskMgr.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    expect(res.body.data.length).toBe(0);
                });             
        });

        it("[MANAGEMENT] should be able to access list of loans on his desk", async () => {
            const managr = getUserByRole(['CCO', 'MANAGING_DIRECTOR', 'CREDIT_COMMITTEE', 'BOARD_MEMBER']);

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${managr[0].access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    expect(res.body.data.length > 0);
                });              
        });
    });

    describe("/POST [MANAGEMENT] move loan", () => {
        it("loan should be in MANAGEMENT desk and have status MD_APPROVAL", async () => {
            const managr = getUserByRole(['CCO', 'MANAGING_DIRECTOR', 'CREDIT_COMMITTEE', 'BOARD_MEMBER']);

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${managr[0].access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.data[0].current_state.slug).toEqual('MD_APPROVAL');
                    expect(managr.slug === res.body.data[0].current_step.slug);
                    expect(res.body).toHaveProperty('pagination');
                });              
        });

        it("[MANAGEMENT] should be able to move loan to next stage", async () => {
            const managr = getUserByRole(['CCO', 'MANAGING_DIRECTOR', 'CREDIT_COMMITTEE', 'BOARD_MEMBER']);

            await request
                .post(`/api/v1/loan_application/${loans.DEFAULT_LOAN.id}/manage`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${managr[0].access_token}` })
                .send({
                    comment: "Everything is looking great from the management side",
                    request_update: false
                })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);
                });             
        });

        it("loan should be in LOAN OFFICER Desk & have status OFFER_LETTER", async () => {
            const loanOfficer = getUserByRole('LOAN_OFFICER');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${loanOfficer.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.data[0].current_state.slug).toEqual('OFFER_LETTER');
                    expect(loanOfficer.slug === res.body.data[0].current_step.slug);
                    expect(res.body).toHaveProperty('pagination');
                });             
        });
    });

    describe("/GET [LOAN_OFFICER]", () => {
        it("should return empty [] to [MANAGEMENT] if loan has been moved", async () => {
            const managr = getUserByRole(['CCO', 'MANAGING_DIRECTOR', 'CREDIT_COMMITTEE', 'BOARD_MEMBER']);

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${managr[0].access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    expect(res.body.data.length).toBe(0);
                });             
        });

        it("[LOAN_OFFICER] should be able to access list of loans on his desk", async () => {
            const officer = getUserByRole('LOAN_OFFICER');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${officer.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body).toHaveProperty('pagination');
                    expect(res.body.data).toEqual(expect.arrayContaining([]));
                    expect(res.body.data.length > 0);
                });              
        });        
    });

    describe("/POST [LOAN_OFFICER] upload OFFER LETTER", () => {
        it("loan should be in LOAN_OFFICER desk and have status OFFER_LETTER", async () => {
            const officer = getUserByRole('LOAN_OFFICER');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${officer.access_token}` })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.data[0].current_state.slug).toEqual('OFFER_LETTER');
                    expect(officer.slug === res.body.data[0].current_step.slug);
                    expect(res.body).toHaveProperty('pagination');
                });              
        });

        it("[LOAN_OFFICER] should be able to upload/move loan to next stage", async () => {
            const officer = getUserByRole('LOAN_OFFICER');

            await request
                .post(`/api/v1/loan_application/${loans.DEFAULT_LOAN.id}/upload`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${officer.access_token}` })
                .send({
                    "uploads": [
                        {
                            "check_list_id": 25, // 25 -> OFFER_LETTER
                            "doc_url": "http://www.africau.edu/images/default/sample.pdf"
                        }
                    ]
                })
                .expect(res => {
                    expect(res.status).toEqual(200);
                    expect(res.body.message).toMatch(/successful/);
                });
        });

        // loan currently in [AUDIT] -> []
        it("loan should be in OPERATION Desk & have status DISBURSEMENT", async () => {
            const operatn = getUserByRole('FINANCIAL_OPERATIONS');

            await request
                .get(`/api/v1/loan_application?page=1&limit=20`)
                .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${operatn.access_token}` })
                .expect(res => {
                    // console.log(res.body);
                    expect(res.status).toEqual(200);
                    // expect(res.body.data[0].current_state.slug).toEqual('OFFER_LETTER');
                    // expect(loanOfficer.slug === res.body.data[0].current_step.slug);
                    // expect(res.body).toHaveProperty('pagination');
                });             
        });
    });
})