const db = require('../src/database/models');

/**
 * Load Dashboard test
 */
 function sleep (time) { return new Promise((resolve) => setTimeout(resolve, time)); }

describe("Dashboard v5.0.0", () => {
  
    afterAll(async function(done){
        const options = {
            force: true, 
            truncate: true, 
            cascade: true, 
            restartIdentity: true             
        }

        try {
            await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

            await db.UserRoles.destroy(options);
            await db.ActivityLog.destroy(options);
            await db.User.destroy(options);
            await db.ClientSpouse.destroy(options);
            await db.Identification.destroy(options);
            await db.BusinessEmployment.destroy(options);
            await db.ClientBank.destroy(options);
            await db.Applicants.destroy(options);
            await db.LoanApplication.destroy(options);
            await db.sequelize.query(`TRUNCATE TABLE bdc_bank_details`);
            await db.sequelize.query(`TRUNCATE TABLE bdc_stocks`);
            await db.sequelize.query(`TRUNCATE TABLE bdc_stock_balances`);
            await db.sequelize.query(`TRUNCATE TABLE bdc_orders`);

            await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (error) {
            throw error;
        }        
        
        // await new Promise(resolve => setTimeout(() => resolve(), 500));

        done();
    });

    // afterAll(function(done){ 
        // server.close(done);
        // jest.useFakeTimers();
    // });

    require('./user.controller.spec');
    require('./auth.controller.spec');
    require('./applicant.controller.spec');
    require('./loan.controller.spec');
    require('./bdc.controller.spec');

});