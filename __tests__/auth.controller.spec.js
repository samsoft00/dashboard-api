const superAgent = require('supertest');
const app = require('../src/app')
const { fakeIp, account, users } = require('./setup');

// console.log(account)
describe("User Authentication", () => {
    let request = null;
    let server = null;

    beforeAll(function(done){
      server = app.listen(done);
      request = superAgent.agent(server);
    });

    afterAll(function(done){ server.close(done) });  

    describe("Login", () => {

        it("throw error if password or email not correct", async () => {
            await request
              .post('/api/v1/user/login')
              .set('x-real-ip', fakeIp )
              .send({ email: 'dodo.gmail.com', password: account.password })
              .expect(res => {
                expect(res.status).toEqual(400)
                expect(res.body.message).toMatch(/invalid email address/)
              });
        })
    
        it('should have property accessToken on successful login', async () => {
            await request
            .post('/api/v1/user/login')
            .set('x-real-ip', fakeIp )
            .send({email: account.email, password: account.password })
            .expect(res => {
                // console.log(res.body)
              expect(res.status).toEqual(200)
              expect(res.body.data.user.email).toEqual(account.email)
              expect(res.body.data).toHaveProperty('access_token')
    
              Object.assign(account, { access_token: res.body.data.access_token })
            })        
        })

        it("Logged-in All users", async (done) => {
          for (const [index, user] of users.entries()) {
              const reqBody = { email: user.email, password: user.password }
      
              const { status, body } = await request
                  .post('/api/v1/user/login')
                  .set({'x-real-ip': fakeIp })
                  .send(reqBody);
      
              if(!status) throw new Error('Error logged-in users');
              users[index] = { ...user, access_token: body.data.access_token }
          } 
          done();           
        })      
      
    });

    describe.skip('Change password', () => {
    
        it('throw error if current password did not match', async () => {
            await request
            .post('/auth/update-password')
            .send({
                current_password: account.password, 
                password: 'logical12343', 
                confirm_password: 'logical1234'
            })
            .set({'Authorization': `Bearer ${account.access_token}`, 'x-real-ip': fakeIp})
            .expect(res => {
              expect(res.status).toEqual(400)
              expect(res.body.message).toMatch(/password must match/)
            })          
        })
        
        it('should be able to update/change password', async () => {
            await request
            .post('/auth/update-password')
            .send({
                current_password: account.password, 
                password: 'logical1234', 
                confirm_password: 'logical1234'
            })
            .set({'Authorization': `Bearer ${account.access_token}`, 'x-real-ip': fakeIp})
            .expect(res => {
              expect(res.status).toEqual(200)
              expect(res.body.message).toMatch(/successful/)
            })         
        })
             
    })

    describe.skip('Reset Password', () => {
        it('throw error if wrong email address supply', async () => {
            await request
            .post('/auth/reset-password')
            .set('x-real-ip', fakeIp)
            .send({ email_or_phone: 'fake@emailcom' })
            .expect(res => {
              expect(res.status).toEqual(400)
            })          
        })
    
        it('throw error if user not found', async () => {
            await request
            .post('/auth/reset-password')
            .set('x-real-ip', fakeIp)
            .send({ email_or_phone: 'fake@emailfaker.com' })
            .expect(res => {
              expect(res.status).toEqual(400)
              expect(res.body.message).toMatch(/fake@emailfaker.com/)
            })           
        })
    
        it('should be able generate reset password', async () => {
            await request
            .post('/auth/reset-password')
            .set('x-real-ip', fakeIp)
            .send({ email_or_phone: account.email })
            .expect(res => {
              Object.assign(account, {reset_token: res.body.data.reset_token})
              expect(res.status).toEqual(200)
            })          
        })       
    })

    describe.skip('Validate reset token', () => {
    
        it('validate reset token, throw error if token is empty', async () => {
            await request
            .post('/auth/validate-reset-token')
            .set('x-real-ip', fakeIp)
            .send({ password_reset_token: '' })
            .expect(res => {
              expect(res.status).toEqual(400)
              expect(res.body.message).toMatch(/token field required/)
            }) 
        })
    
        it('throw error not found or expire', async () => {
            await request
            .post('/auth/validate-reset-token')
            .set('x-real-ip', fakeIp)
            .send({ password_reset_token: v4() })
            .expect(res => {
              expect(res.status).toEqual(400)
              expect(res.body.message).toMatch(/invalid or expired/)
            })         
        })
    
        it('should be able to validate reset token', async () => {
            await request
            .post('/auth/validate-reset-token')
            .set('x-real-ip', fakeIp)
            .send({ password_reset_token: account.reset_token })
            .expect(res => {
              expect(res.status).toEqual(200)
              expect(res.body.message).toMatch(/token is valid!/)
            })         
        }) 
         
    })

    describe.skip('Update Reset password', () => {
        
        it('throw error if password and password confirm not the same', async () => {
            await request
            .post(`/auth/reset/${account.reset_token}`)
            .set('x-real-ip', fakeIp)
            .send({ 
                password: 'password123',
                confirm_password: 'password321'
             })
            .expect(res => {
              expect(res.status).toEqual(400)
              expect(res.body.message).toMatch(/password must match/)
            })        
        })
    
        it('should be able to reset password successful', async () => {
            await request
            .post(`/auth/reset/${account.reset_token}`)
            .set('x-real-ip', fakeIp)
            .send({ 
                password: 'password321',
                confirm_password: 'password321'
             })
            .expect(res => {
              expect(res.status).toEqual(200)
              expect(res.body.message).toMatch(/reset successfully/)
            })        
        })         
    })
})