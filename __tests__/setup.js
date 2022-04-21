const faker = require('faker');
const dayjs = require('dayjs');
const userData = require('../data/user.json');

const userDept = {
    1: 'LOAN_OFFICER',
    2: 'LOAN_SUPERVISOR',
    3: 'RISK_MANAGEMENT',
    4: 'MANAGING_DIRECTOR',
    5: 'OPERATION',
    6: 'INFORMATION_TECHNOLOGY',
    7: 'RELATION_OFFICER',
    8: 'AUDIT',
    9: 'INTERNAL_CONTROL',
    10: 'FINANCE',
    11: 'DONNETTE_BDC',
    12: 'SEBASTIAN_BDC'
};

faker.locale = 'en_US';
const fakeIp = faker.internet.ip();

const users = userData.map(u => {
    const deptId = u.department_id;
    delete u.department_id;

    return { ...u, department: { department_id: deptId, slug: userDept[deptId] } } 
});

// logged-in users.
const logUserIn = async (app) => {
    for (const [index, user] of users.entries()) {
        const reqBody = {
            email: user.email,
            password: user.password
        }

        const { status, body } = await app
            .post('/api/v1/user/login')
            .set({'x-real-ip': fakeIp })
            .send(reqBody);

        if(!status) throw new Error('Error logged-in users');

        users[index] = { ...user, access_token: body.data.access_token }
    }
}

const firstName = faker.name.firstName();
const lastName = faker.name.lastName();

const account = (() => {
    return {
        fullname: `${firstName} ${lastName}`,
        email: faker.internet.email().toLowerCase(),
        phone_number: faker.phone.phoneNumber('080########'),
        username: faker.internet.userName(firstName, lastName).toLowerCase(),
        department_id:6,
        role_id :2
    }
})();


const appFirstName = faker.name.firstName();
const appLastName = faker.name.lastName();
const gender = faker.helpers.randomize(['male', 'female']);

const applicantData = (() => {
    return {
        name: `${appFirstName} ${appLastName}`,
        title: Object.is(gender, 'male') ? 'Mr.' : 'Mrs.',
        date_of_birth: dayjs(faker.date.between("1963-01-01", "1990-01-05")).format('YYYY-MM-DD'),
        gender: gender, // "female",
        marital_status: faker.helpers.randomize(["single", "married", "complicated"]),
        mother_maiden_name: faker.name.middleName(),
        home_address: "17a Dele Adedeji Street, Off Bisola Durosinmi-Etti Street, Lekki Phase I -Lagos",
        landmark: "Lekki Phase I",
        phone_number: faker.phone.phoneNumber('080########'),
        bvn: `${faker.datatype.number(7)}3${faker.datatype.number(7)}3785493${faker.datatype.number(7)}`,
        religion: "Christian",
        place_of_worship: "The Redeemed Christian Church of God",
        email_address: faker.internet.email(),
        place_of_issuance: "Lagos",
        id_card_number: `${faker.random.alpha({count:1, upcase: true})}0${faker.phone.phoneNumber().replace(/\D/g,'').substr(1, 7)}`,//
        date_issued: dayjs(faker.date.past(1)).format('YYYY-MM-DD'), // '2021-03-17',
        expiry_date_issued: dayjs(faker.date.future(2)).format('YYYY-MM-DD'), // '2022-03-16',
        spouse_name: Object.is(gender, 'male') ? `Mrs. ${appFirstName} ${appLastName}` : `Mr. ${appFirstName} ${appLastName}`,
        spouse_phone_number: faker.phone.phoneNumber('070########'),
        spouse_occupation_id: 1,
        identity_type_id: 3,
        education_id: 5,
        occupation_id: 1,
        lga_id: 503,
        place_of_birth_id: 25        
    }
})();

const loans = {
    DEFAULT_LOAN: {
        amount: 7000000,
        monthly_repayment_amount:1000000,
        repayment_frequency: faker.helpers.randomize(["weekly", "monthly"]),
        maturity_tenor: "1 year",
        collateral_offered: "Beautiful house in banana highland",
        purpose: "Increase production of cannabis in the east",
        loan_source_id: 1,
        loan_type_id: 2,
        business_employment_id: 28,
        bank_detail_id: 64        
    },
    SALARY_LOAN: {},
    BUSINESS_LOAN_RLCN: {},
    BUSINESS_LOAN_MICRO: {},
    BUSINESS_LOAN_SME: {},
    ASSET_FINANCING: {}
}

const businessEmpl = {
    business_name: "Canary Point Corporate Services",
    business_employment_type_id: 3,
    business_office_address: "17a Dele Adedeji Street, Off Bisola Durosinmi-Etti Street, Lekki Phase I -Lagos. Nigeria",
    business_activity: "Micro-finance banking",
    year_of_experience: 10,
    office_phone_no: "01-6329480",
    email_address: "info@canarypointcs.com",
    position: "Manager Directory",
    monthly_income: 1230200,
    monthly_expenses: 230000
}

const bankDetails = {
    bank_id: 2, 
    account_number: "0045515280", 
    account_name: "Oyewale Jinadu"
}

const bdcOrders = [
    {
        customer: {
            id: 20,
            name: faker.company.companyName(), // "Westcon group africa operations limnited",
            email: faker.internet.email(),
            phone_number: faker.phone.phoneNumber('080########')
        },
        transaction_type: faker.helpers.randomize(["sell", "buy"]),
        volume: 4000,
        exchange_rate: 510,
        mode_of_payment: faker.helpers.randomize(["wire", "cash", "wire/cash"]), // "wire", 'wire', 'cash', 'wire/cash'
        cash_payment: 2500,
        bdc_bank_detail_id: 1,
        currency_type_id: 5,
        bdc_dept_id: 11, // <- 1. Sebastian BDC 2. Donnette BDC
        status: "completed"
    }    
]

// console.log(applicant);

module.exports = {
    fakeIp,
    account,
    users,
    applicantData,
    loans,
    businessEmpl,
    bankDetails,
    bdcOrders,
    logUserIn
}