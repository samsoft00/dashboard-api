const Joi = require('@hapi/joi').extend(require('@hapi/joi-date'));
const { ValidationError } = require('@hapi/joi');
const { validate: validateEmail } = require('email-validator');

const customEmailValidatn = (email, helpers) => {
  const isValid = validateEmail(email);
  if (!isValid) return helpers.message({ custom: `${email}: invalid email address` });

  return email;
};

// FX ORDER PAYING BANK
const sourceObj = Joi.object().keys({
  // id: Joi.any().optional(),
  paying_bank: Joi.string().label('paying bank').required(),
  amount: Joi.number().strict().label('amount').required(),
});

// BANK DETAILS
const bankDetailObj = Joi.object().keys({
  // id: Joi.any().optional(), // if this present, validate receiving_bank_id
  bank_name: Joi.string().label('Bank name').required(),
  account_number: Joi.string().label('bank account number').required(),
  account_name: Joi.string().label('bank account name').required(),
  iban_number: Joi.string().label('iban number').allow(''), // if this is valid, request for route,swift,sort
  routing_number: Joi.string().label('routing number').allow(''),
  swift_code: Joi.string().label('swift code').allow(''),
  branch_sort_code: Joi.string().label('sort code').allow(''),
  // receiving_bank_id: Joi.any().optional(),
});

// const clientBank = Joi.object().keys({
//   id: Joi.number().optional(),
//   bank_id: Joi.number().required().error(new ValidationError('Please select a valid bank name!')),
//   account_number: Joi.string()
//     .length(10)
//     .pattern(/^[0-9]+$/)
//     .required()
//     .error(new ValidationError('Invalid account number, number must be 10 digits!')),
//   account_name: Joi.string().required().error(new ValidationError('Please enter account name!')),
// });

const getMessage = () => {
  return {
    'string.empty': ' is not allowed to be empty',
    'string.base': ' is not valid',
    'any.required': ' is required',
    'number.base': ' must be a number',
    'array.min': ' must contain at least 1 items',
  };
};

const getError = (err) => {
  const row = { 0: 'first', 1: 'second', 2: 'third' };
  if (err.path.length > 1) return ` on ${row[err.path[1]]} row`;
  return '';
};

export default class ValidatorHelper {
  static validateLogin() {
    return Joi.object({
      email: Joi.string()
        .custom(customEmailValidatn, 'email validation')
        .required()
        .error((errors) => new ValidationError(errors.map((err) => err).join(' and '))),
      password: Joi.string().required().error(new ValidationError('password is required!')),
    });
  }

  static validateUpdateUser() {
    return Joi.object().keys({
      fullname: Joi.string()
        .min(3)
        .required()
        .error(new ValidationError('Full name must be at least 5 characters long')),
      email: Joi.string()
        .custom(customEmailValidatn, 'email validation')
        .required()
        .error((errors) => {
          return new ValidationError(errors.map((err) => err).join(' and '));
        }),
      username: Joi.string()
        .min(6)
        .max(20)
        .required()
        .error(new ValidationError('Username is required and must be atleast 6 characters long!')),
      phone_number: Joi.string()
        .required()
        .error(new ValidationError('Phone number is complulsory')),
      department_id: Joi.number()
        .required()
        .error(new ValidationError('Department is compulsory!')),
    });
  }

  static validateUser() {
    return Joi.object().keys({
      fullname: Joi.string()
        .min(3)
        .required()
        .error(new ValidationError('Full name must be at least 5 characters long')),
      email: Joi.string()
        .custom(customEmailValidatn, 'email validation')
        .required()
        .error((errors) => {
          return new ValidationError(errors.map((err) => err).join(' and '));
        }),
      username: Joi.string()
        .min(6)
        .max(20)
        .required()
        .error(new ValidationError('Username is required and must be atleast 6 characters long!')),
      role_id: Joi.number().required().error(new ValidationError('Please select valid role ID!')),
      department_id: Joi.number()
        .required()
        .error(new ValidationError('Department is compulsory!')),
      /*
      password: Joi.string()
        .regex(/^[a-zA-Z0-9!@#$%&*]{3,25}$/)
        .required()
        .error(new ValidationError('Invalid password, special character is not allow!')),
      confirm_password: Joi.any()
        .valid(Joi.ref('password'))
        .required()
        .error(new ValidationError('Password and confirm password must match')),
        */
      phone_number: Joi.string()
        .label('Phone number')
        .pattern(/^[0-9]+$/)
        .length(11)
        .required()
        .error(new ValidationError('Invalid phone number, must be number and 11 character long.')),
      // .messages({ 'string.pattern.base': 'Invalid phone number, must be number and 11 character long.' })
      // phone_number: Joi.string()
      //   .required()
      //   .error(new ValidationError('Phone number is complulsory')),
    });
  }

  static validateOutflow() {
    return Joi.object().keys({
      transaction_type_id: Joi.number()
        .required()
        .error(new ValidationError('Kindly, select order transaction type, e.g inflow or outflow')),
      volume: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Volume is required, must be a number')),
      exchange_rate: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Error occur! kindly provide current rates')),
      currency_from_id: Joi.number()
        .required()
        .error(new ValidationError('Source Currency type is required')),
      currency_to_id: Joi.number()
        .required()
        .error(new ValidationError('Destination Currency type is required')),
      receiving_bank: bankDetailObj
        .label('Receiving Bank')
        .required()
        .error(
          (errors) =>
            new ValidationError(
              `${errors
                .map(
                  (err) =>
                    `${err.path.length > 1 ? 'Receiving' : ''} ${err.local.label}${
                      getMessage()[err.code]
                    }`
                )
                .join(' and ')
                .trim()}`
            )
        ),
      beneficiary_details: Joi.array()
        .label('Beneficiary details')
        .min(1)
        .items(bankDetailObj)
        .required()
        .error((errors) => {
          return new ValidationError(
            `${errors
              .map(
                (err) =>
                  `${err.path.length > 1 ? 'Beneficiary' : ''} ${err.local.label}${
                    getMessage()[err.code]
                  }${getError(err)}`
              )
              .join(' and ')}`
          );
        }),
      payment_source: Joi.array()
        .items(sourceObj)
        .label('Payment sources')
        .min(1)
        .required()
        .error((errors) => {
          return new ValidationError(
            `${errors
              .map(
                (err) =>
                  `${err.path.length > 1 ? 'Payment sources' : ''} ${err.local.label}${
                    getMessage()[err.code]
                  }${getError(err)}`
              )
              .join(' and ')}`
          );
        }),
      total_payment: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Total Payment is compulsory.')),
      bank_charges: Joi.number()
        .strict()
        .allow('', null)
        .default(0)
        .required()
        .error(new ValidationError('Bank charges is required.')),
      other_charges: Joi.number()
        .strict()
        .error(new ValidationError('Other charges must be a number.')),
      tranx_purpose: Joi.string(),
      priority: Joi.string()
        .required()
        .error(new ValidationError('Select order priority, e.g high, low or medium')),
      customer: Joi.object().keys({
        id: Joi.number().required().error(new ValidationError('Customer KYC ID is required')),
        name: Joi.string().required().error(new ValidationError('Customer name is required')),
        email: Joi.string()
          .custom(customEmailValidatn, 'email validation')
          .required()
          .error(new ValidationError('Customer email address is required')),
        address: Joi.string()
          .required()
          .error(new ValidationError('Kindly provide customer address')),
        phone_number: Joi.string().error(new ValidationError('Customer phone number is required')),
      }),
    });
  }

  static validateInflow() {
    return Joi.object().keys({
      transaction_type_id: Joi.number()
        .required()
        .error(new ValidationError('Kindly, select order transaction type, e.g inflow or outflow')),
      volume: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Volume is required, must be a number')),
      exchange_rate: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Error occur! kindly provide current rates')),
      currency_from_id: Joi.number()
        .required()
        .error(new ValidationError('Source Currency type is required')),
      currency_to_id: Joi.number()
        .required()
        .error(new ValidationError('Destination Currency type is required')),
      receiving_bank: bankDetailObj
        .label('Receiving Bank')
        .required()
        .error(
          (errors) =>
            new ValidationError(
              `${errors
                .map(
                  (err) =>
                    `${err.path.length > 1 ? 'Receiving' : ''} ${err.local.label}${
                      getMessage()[err.code]
                    }`
                )
                .join(' and ')
                .trim()}`
            )
        ),
      beneficiary_details: Joi.array()
        .label('Beneficiary details')
        .min(1)
        .items(bankDetailObj)
        .required()
        .error((errors) => {
          return new ValidationError(
            `${errors
              .map(
                (err) =>
                  `${err.path.length > 1 ? 'Beneficiary' : ''} ${err.local.label}${
                    getMessage()[err.code]
                  }${getError(err)}`
              )
              .join(' and ')}`
          );
        }),
      payment_source: Joi.array()
        .items(sourceObj)
        .label('Payment sources')
        .min(1)
        .required()
        .error((errors) => {
          return new ValidationError(
            `${errors
              .map(
                (err) =>
                  `${err.path.length > 1 ? 'Payment sources' : ''} ${err.local.label}${
                    getMessage()[err.code]
                  }${getError(err)}`
              )
              .join(' and ')}`
          );
        }),
      total_payment: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Total Payment is compulsory.')),
      // bank_charges: Joi.number().strict().required().error(new ValidationError('Bank charges is required.')),
      // other_charges: Joi.number().strict().error(new ValidationError('Other charges must be a number.')),
      // tranx_purpose: Joi.string(),
      priority: Joi.string()
        .required()
        .error(new ValidationError('Select order priority, e.g high, low or medium')),
      customer: Joi.object().keys({
        id: Joi.number().required().error(new ValidationError('Customer KYC ID is required')),
        name: Joi.string().required().error(new ValidationError('Customer name is required')),
        email: Joi.string()
          .custom(customEmailValidatn, 'email validation')
          .required()
          .error(new ValidationError('Customer email address is required')),
        address: Joi.string()
          .required()
          .error(new ValidationError('Kindly provide customer address')),
        phone_number: Joi.string().error(new ValidationError('Customer phone number is required')),
      }),
    });
  }

  static validateSap() {
    return Joi.object().keys({
      fullname: Joi.string()
        .min(3)
        .required()
        .error(new ValidationError('Full name must be at least 5 characters long')),
      email: Joi.string()
        .custom(customEmailValidatn, 'email validation')
        .required()
        .error((errors) => {
          return new ValidationError(errors.map((err) => err).join(' and '));
        }),
      phone_number: Joi.string()
        .required()
        .error(new ValidationError('Phone number is complulsory')),
    });
  }

  static validateDept() {
    return Joi.object().keys({
      name: Joi.string()
        .min(5)
        .required()
        .error(new ValidationError('Department name must be at least 5 characters long')),
      description: Joi.string().required().error(new ValidationError('Description is required')),
    });
  }

  static validateApplicant() {
    return Joi.object().keys({
      name: Joi.string()
        .min(5)
        .required()
        .error(new ValidationError('Name must be at least 5 characters long')),
      title: Joi.string()
        .required()
        .error(new ValidationError('Title must be atleast 2 characters long')),
      date_of_birth: Joi.date()
        .format('YYYY-MM-DD')
        .required()
        .error(new ValidationError('Date of birth must be in YYYY-MM-DD format')),
      gender: Joi.string()
        .valid('female', 'male')
        .required()
        .error(new ValidationError('Gender required, must be either male or female')),
      marital_status: Joi.string()
        .valid('married', 'single', 'complicated')
        .required()
        .error(new ValidationError('Marital status required, either married or single')),
      home_address: Joi.string()
        .required()
        .error(new ValidationError('Please enter valid home address')),
      landmark: Joi.string().required().error(new ValidationError('Landmark is required')),
      religion: Joi.string().required().error(new ValidationError('Religion field is required')),
      place_of_worship: Joi.string()
        .required()
        .error(new ValidationError('Place of worship field is required')),
      mother_maiden_name: Joi.string()
        .required()
        .error(new ValidationError('Mother maiden name  is required')),
      email_address: Joi.string()
        .custom(customEmailValidatn, 'email validation')
        .required()
        .error((errors) => {
          return new ValidationError(errors.map((err) => err).join(' and '));
        }),
      phone_number: Joi.string()
        .required()
        .error(new ValidationError('Phone number is complulsory')),
      place_of_issuance: Joi.string()
        .required()
        .error(new ValidationError('Place of issurance is required')),
      // repeat_loan: Joi.boolean().required().error(new ValidationError('Check if loan is repeated')),
      id_card_number: Joi.string()
        .required()
        .error(new ValidationError('Identity card number is required')),
      date_issued: Joi.date()
        .format('YYYY-MM-DD')
        .required()
        .error(new ValidationError('Date issued must be in YYYY-MM-DD format')),
      expiry_date_issued: Joi.date()
        .format('YYYY-MM-DD')
        .greater(Joi.ref('date_issued'))
        .required()
        .error(
          new ValidationError(
            'Expiry date issued must be greater than issued date and must be in YYYY-MM-DD format'
          )
        ),

      // Spouse Information
      spouse_name: Joi.string().required().error(new ValidationError('Spouse name is compulsory')),
      spouse_phone_number: Joi.string()
        .required()
        .error(new ValidationError('Spouse phone number is compulsory')),
      spouse_occupation_id: Joi.number()
        .required()
        .error(new ValidationError('Please select spouse occupation!')),
      bvn: Joi.string()
        .length(11)
        .pattern(/^[0-9]+$/)
        .required()
        .error(new ValidationError('Invalid BVN number, number must be 11 digit!')),
      identity_type_id: Joi.number()
        .required()
        .error(new ValidationError('Please select valid identification id!')),
      education_id: Joi.number()
        .required()
        .error(new ValidationError('Please select valid education qualification!')),
      occupation_id: Joi.number()
        .required()
        .error(new ValidationError('Please select valid occupation!')),
      lga_id: Joi.number()
        .required()
        .error(new ValidationError('Please select valid local govt area!')),
      place_of_birth_id: Joi.number()
        .required()
        .error(new ValidationError('Please select place of birth')),
      // bank_details: Joi.array().label('Bank Details').min(1).items(clientBank).required(),
    });
  }

  static validateBusiness() {
    return Joi.object().keys({
      business_name: Joi.string()
        .min(5)
        .required()
        .error(
          new ValidationError('Business or employment name must be at least 5 characters long')
        ),
      business_employment_type_id: Joi.number()
        .required()
        .error(new ValidationError('Please select business or employment type!')),
      business_office_address: Joi.string()
        .required()
        .error(new ValidationError('Business or employment office address is required')),
      business_activity: Joi.string()
        .required()
        .error(new ValidationError('Business activity is required')),
      year_of_experience: Joi.number()
        .required()
        .error(new ValidationError('Year of experience is required')),
      office_phone_no: Joi.string()
        .required()
        .error(new ValidationError('Kindly enter office phone number.')),
      email_address: Joi.string()
        .custom(customEmailValidatn, 'email validation')
        .error((errors) => {
          return new ValidationError(errors.map((err) => err).join(' and '));
        }),
      position: Joi.string().required().error(new ValidationError('Position/Function is required')),
      monthly_income: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Monthly income field is required and must be a number')),
      monthly_expenses: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Monthly expenses is compulsory must be a number')),
    });
  }

  static validateLoanApp() {
    return Joi.object().keys({
      amount: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Kindly specify loan amount in number')),
      repayment_frequency: Joi.string()
        .required()
        .error(
          new ValidationError(
            'Please enter loan frequency of re-payment, e.g weekly, monthly, yearly'
          )
        ),
      monthly_repayment_amount: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Please enter loan monthly repayment amount')),
      maturity_tenor: Joi.string()
        .required()
        .error(new ValidationError('Please enter loan Maturity/Tenor')),
      collateral_offered: Joi.string()
        .required()
        .error(new ValidationError('Loan collateral offered is required')),
      purpose: Joi.string().required().error(new ValidationError('Please enter loan purpose')),
      business_employment_id: Joi.number()
        .required()
        .error(new ValidationError('Applicant current business or employment is required')),
      bank_detail_id: Joi.number()
        .required()
        .error(new ValidationError('Please select applicant bank detail')),
      loan_type_id: Joi.number().required().error(new ValidationError('Please select loan type')),
      loan_source_id: Joi.number()
        .required()
        .error(new ValidationError('Please select Loan sources')),
    });
  }

  static validateUserRole() {
    return Joi.object().keys({
      user_id: Joi.number().required().error(new ValidationError('Please select valid user!')),
      roles: Joi.array().items(Joi.number().optional()),
    });
  }

  static validateRole() {
    return Joi.object().keys({
      name: Joi.string().required().error(new ValidationError('Role name is required')),
      description: Joi.string().required().error(new ValidationError('Description is required')),
    });
  }

  static validateEdu() {
    return Joi.object().keys({
      name: Joi.string().required().error(new ValidationError('Name is required!')),
    });
  }

  static validateManageLoan() {
    return Joi.object().keys({
      assign_to: Joi.number().error(
        new ValidationError('Kindly provide ID of the staff you want to assign this to')
      ),
      comment: Joi.string()
        .min(5)
        .required()
        .error(
          new ValidationError(
            'Kindly add comment before you proceed, comment must be at least 5 character long!'
          )
        ),
      request_update: Joi.boolean().error(
        new ValidationError('Request Update, check if you want application update!')
      ),
    });
  }

  static validateLoanDocUpload() {
    const schemaObj = Joi.object()
      .keys({
        check_list_id: Joi.number().required(),
        doc_url: Joi.string().required(),
      })
      .unknown(true);

    return Joi.object().keys({
      uploads: Joi.array()
        .items(schemaObj)
        .required()
        .error(
          new ValidationError(
            'Please provide array of object with list of checkList ID and doc_url'
          )
        ),
    });
  }

  static validatePasswordOnly() {
    return Joi.object().keys({
      password: Joi.string()
        .regex(/^[a-zA-Z0-9!@#$%&*]{3,25}$/)
        .required()
        .error(new ValidationError('Invalid password, special character is not allow!')),
      confirm_password: Joi.any()
        .valid(Joi.ref('password'))
        .required()
        .error(new ValidationError('Password and confirm password must match')),
    });
  }

  static updatePassword() {
    return Joi.object().keys({
      current_password: Joi.string()
        .required()
        .error(new ValidationError('Current password is required!')),
      password: Joi.string()
        .regex(/^[a-zA-Z0-9!@#$%&*]{3,25}$/)
        .required()
        .error(new ValidationError('Invalid password, special character is not allow!')),
      confirm_password: Joi.any()
        .valid(Joi.ref('password'))
        .required()
        .error(new ValidationError('Password and confirm password must match')),
    });
  }

  static validateSupportDoc() {
    return Joi.object().keys({
      description: Joi.string()
        .min(3)
        .required()
        .error(new ValidationError('Fx Order support doc is required!')),
    });
  }

  static validateExportDate() {
    return Joi.object({
      start_date: Joi.date()
        .format('YYYY-MM-DD')
        .optional()
        .error(new ValidationError('Start date is required, must be in YYYY-MM-DD format')),
      end_date: Joi.date()
        .format('YYYY-MM-DD')
        .greater(Joi.ref('start_date'))
        .required()
        .error(new ValidationError('End date is required, must be greater than start date')),
      transaction_type_id: Joi.number()
        .allow('')
        .optional()
        .error(new ValidationError('Source Currency type is required')),
    });
  }

  static validateLoanExport() {
    return Joi.object({
      start_date: Joi.date()
        .format('YYYY-MM-DD')
        .optional()
        .error(new ValidationError('Start date is required, must be in YYYY-MM-DD format')),
      end_date: Joi.date()
        .format('YYYY-MM-DD')
        .greater(Joi.ref('start_date'))
        .required()
        .error(new ValidationError('End date is required, must be greater than start date')),
      loan_source: Joi.number().required().error(new ValidationError('Please select loan source')),
      loan_type: Joi.number()
        .allow('')
        .optional()
        .error(new ValidationError('Loan type is required')),
    });
  }

  static validateBdcOrder() {
    return Joi.object({
      customer: Joi.object().keys({
        id: Joi.number().required().error(new ValidationError('Customer BDC KYC ID is required')),
        name: Joi.string().required().error(new ValidationError('Customer name is required')),
        email: Joi.string()
          .custom(customEmailValidatn, 'email validation')
          .required()
          .error(new ValidationError('Customer email address is required')),
        phone_number: Joi.string().error(new ValidationError('Customer phone number is required')),
      }),
      transaction_type: Joi.string()
        .valid('buy', 'sell')
        .required()
        .error(new ValidationError('Kindly, select order transaction type, e.g Buy or Sell')),
      currency_type_id: Joi.number()
        .required()
        .error(new ValidationError('Currency type is required')),
      volume: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Volume is required, must be a number')),
      exchange_rate: Joi.number()
        .strict()
        .required()
        .error(new ValidationError('Error occur! kindly provide current rates')),
      mode_of_payment: Joi.string()
        .valid('wire', 'cash', 'wire/cash')
        .required()
        .error(new ValidationError('Kindly, select mode of payment, e.g wire, cash or wire/cash')),
      cash_payment: Joi.number()
        .strict()
        .optional()
        .error(
          new ValidationError('Are you receiving or paying cash? please specify cash payment')
        ),
      bdc_dept_id: Joi.number()
        .strict()
        .required()
        .error(
          new ValidationError(
            'BDC department is required (e.g Sebastian BDC), kindly select your department.'
          )
        ),
      bdc_bank_detail_id: Joi.number()
        .strict()
        .optional()
        .error(
          new ValidationError(
            'Kindly select paying or receiving bank, + add new bank info if not available in the bank list'
          )
        ),
      status: Joi.string()
        .valid('pending', 'completed')
        .required()
        .error(new ValidationError('Is transaction completed? please select transaction status')),
    });
  }
}
