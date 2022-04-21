const superAgent = require('supertest');
const app = require('../src/app');

const { account, bdcOrders, fakeIp, users } = require('./setup');
const bdcUser = users.filter(user => /_BDC/.test(user.department.slug));
const stockbalance = []
let dbcOrders = []
let bdcBank = {}

describe("BDC Order", () => {
    let request, server = null;

    beforeAll(function(done){
      server = app.listen(done);
      request = superAgent.agent(server);
    });

    afterAll(function(done){ server.close(done) });

    /**
     * 0. Should allow only BDC staffs to create order.
     * 0. throw error if stock balance are not set
     * 0. should be able to set stock balances
     * 1. Throw error if user is not in BDC
     * 2. throw error if customer is not valid object
     * 3. Should get BDC stock balances
     * 4. Should be able to create order
     * 5. Compare stock balance with previous balance.
     * 6. Should get lists of BDC Orders.
     * 7. Should get BDC Order By ID
     * 8. BDC User should be able to generate generateDailyReport
     * 9. Should be able to see list of downloadable reports - downloadReports
     * 10. Should be able to getStockBalance and updateStocks balance
     * 11. SHould be able to getBdcBankDetails and update Bank details     
     */

    // -

    describe("/BDC Banks", () => {
      it("Create bdc bank", async (done) => {
        await request
          .post(`/api/v1/bdc/bank-detail`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .send({
            "bank_id": 4,
            "account_number": "0012783242",
            "account_name": "Canary BDC Sebestan",
            "is_disabled": false         
          })
          .expect(res => {
              
              expect(res.status).toEqual(200);
              expect(res.body.message).toMatch(/successful/);        
              
              Object.assign(bdcBank, res.body.data);
          });

        done();        
      });

      it("Get all bdc bank", async (done) => {
        await request
          .get(`/api/v1/bdc/bank-details?page=1&limit=2`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .expect(res => {
              expect(res.status).toEqual(200);
              expect(res.body).toHaveProperty('data')
              expect(res.body).toHaveProperty('pagination')
              expect(res.body.data).toEqual(expect.arrayContaining([]));            
              
          });

        done();
      });

      it("Get bdc bank by ID", async (done) => {
        await request
          .get(`/api/v1/bdc/bank-detail/${bdcBank.id}`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .expect(res => {
              expect(res.status).toEqual(200);
              expect(res.body).toHaveProperty('data')
          });

        done();        
      });

      it("Update bdc bank", async (done) => {
        await request
          .put(`/api/v1/bdc/bank-detail/${bdcBank.id}`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .send({
            "bank_id": 4,
            "account_number": "0012783242",
            "account_name": "Canary BDC Sebestan",
            "is_disabled": true
          })
          .expect(res => {
              expect(res.status).toEqual(200);
          });

        done(); 
      });
    });

    describe("/GET Stock balances", () => {
      it("should get BDC stock balances", async (done) => {
        await request
          .get(`/api/v1/bdc/stock-balances`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .expect(res => {
              expect(res.status).toEqual(200);
              expect(res.body.message).toMatch(/successful/);                    

              stockbalance.push(...res.body.data);
          });

        done();
      })

      it("throw error if stock balance are not set", async (done) => {
        const bdcOrder = bdcOrders[0];
        
        await request
          .post(`/api/v1/bdc/order/create-new-order`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .send(bdcOrder)
          .expect(res => {
              expect(res.status).toEqual(400);
              expect(res.body.message).toMatch(/Stock balances are not set/);                    
          });

        done();  
      });
      
      it("should be able to set stock balances", async (done) => {

        for (const [index, stock] of stockbalance.entries()) {
  
          const { status, body } = await request
              .put(`/api/v1/bdc/stock-balance/${stock.id}`)
              .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
              .send({ "stock_balance": 2000 });
          
          if(!status) throw new Error('Error updating stocks');
          stockbalance[index] = { done: true };
        }

        done(); 
      });      
      
    });

    describe("/POST Create BDC Order", () => {
      it("throw error if staff is not BDC staffs", async (done) => {
        const bdcOrder = bdcOrders[0];
        
        await request
          .post(`/api/v1/bdc/order/create-new-order`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
          .send(bdcOrder)
          .expect(res => {
              expect(res.status).toEqual(401);
              expect(res.body.message).toMatch(/not authorized to perform this action/);                    
          });

        done();        

      })

      it("throw error if customer is not valid object", async (done) => {
        const { customer, ...others} = bdcOrders[0];
        
        await request
          .post(`/api/v1/bdc/order/create-new-order`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .send({
            customer: {
              id: customer.id,
              phone_number: customer.phone_number
            },
            ...others
          })
          .expect(res => {
              expect(res.status).toEqual(400);
              expect(res.body.message).toMatch(/Customer name is required/);
          });

        done();      
      })

      it("should through error if BDC Dept is not added", async (done) => {
        const {bdc_dept_id, ...bdcorder} = bdcOrders[0];
        
        await request
          .post(`/api/v1/bdc/order/create-new-order`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .send(bdcorder)
          .expect(res => {
              expect(res.status).toEqual(400);
              expect(res.body.message).toMatch(/BDC department is required/);
          });

          done();        
      });

      it("should throw error if user dept is diff from order dept selected", async (done) => {
          const bdcorder = bdcOrders[0];
          
          await request
            .post(`/api/v1/bdc/order/create-new-order`)
            .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
            .send({
              ...bdcorder,
              bdc_bank_detail_id: bdcBank.id,
              bdc_dept_id: 12,
            })
            .expect(res => {
                expect(res.status).toEqual(400);
                expect(res.body.message).toMatch(/Department mismatch/);
            });

          done();        
      })

      it("should be able to create order", async (done) => {
        const bdcorder = bdcOrders[0];
        
        await request
          .post(`/api/v1/bdc/order/create-new-order`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${users[users.length - 1].access_token}` })
          .send({
            ...bdcorder,
            bdc_bank_detail_id: bdcBank.id,
          })
          .expect(res => {
              expect(res.status).toEqual(200);
              expect(res.body.message).toMatch(/order created!/);
          });

        done();        
      });
    });

    describe("/GET BDC Orders", () => {
      it("should get BDC orders by dept ID", async (done) => {
        await request
          .get(`/api/v1/bdc/orders?dept_id=11&page=1&limit=10`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
          .expect(res => {
              expect(res.status).toEqual(200);
              expect(res.body).toHaveProperty('data')
              expect(res.body).toHaveProperty('pagination')
              expect(res.body.data).toEqual(expect.arrayContaining([])); 
              
              dbcOrders.push(...res.body.data.rows);
          });

        done();        
      });

      it("should get BDC Order by ID", async (done) => {
        const order = dbcOrders[0];

        await request
          .get(`/api/v1/bdc/order/${order.id}`)
          .set({ 'x-real-ip': fakeIp, 'Authorization': `Bearer ${account.access_token}` })
          .expect(res => {
              // console.log(res.body)
              expect(res.status).toEqual(200);
              expect(res.body).toHaveProperty('data'); 
          });

        done();         
      });
    });

});