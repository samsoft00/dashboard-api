/**
 * Fx Order response format class
 */
export default class UserResponse {
  constructor(data) {
    const { password, updated_at, reset_token, reset_expires, is_disabled, ...others } =
      data.toJSON();

    return others;
  }
}
