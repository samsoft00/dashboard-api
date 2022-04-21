/* eslint-disable no-restricted-properties */
/**
 * Generator functions
 */
export default class Generator {
  static randomNumber(length) {
    return Math.floor(
      Math.pow(10, length - 1) +
        Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)
    ).toString();
  }

  static randomString(len) {
    let randomString = '';
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < len; i += 1) {
      const randomPoz = Math.floor(Math.random() * charSet.length);
      randomString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomString;
  }

  static getPrefix(len) {
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    // eslint-disable-next-line prefer-spread
    return Array.apply(null, Array(len))
      .map(() => {
        return charSet.charAt(Math.floor(Math.random() * charSet.length));
      })
      .join('');
  }

  /**
   * Generate 6 digits token
   */
  static generateToken() {
    const dateTime = new Date();
    return (Math.floor(dateTime.getTime() * 90000) + 10000).toString().substring(8, 14);
  }
}
