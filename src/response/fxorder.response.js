/**
 * Fx Order response format class
 */
export default class FxOrderResponse {
  // invoice_no,
  constructor(data) {
    const {
      payment_source,
      beneficiary_details,
      customer,
      receiving_bank,
      receiving_bank_id,
      currency_from,
      currency_to,
      transaction_type,
      current_state,
      current_step,
      support_docs,
      logs,
      created_at,
      updated_at,
      ...others
    } = data.toJSON();

    return {
      ...others,
      transaction_type,
      customer,
      payment_source,
      receiving_bank,
      beneficiary_details,
      currency_from,
      currency_to,
      current_state,
      current_step,
      support_docs,
      logs,
      created_at,
      updated_at,
    };
  }
}
