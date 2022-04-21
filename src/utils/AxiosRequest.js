import axios from 'axios';

export default (token, url, method, data, ErrHandler = null) => {
  return new Promise((resolve, reject) => {
    try {
      axios({
        method,
        url,
        data,
        headers: { Authorization: token },
      })
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          // eslint-disable-next-line prefer-const
          let errResp = err.response.data
            ? err.response.data
            : { message: err.message, status_code: 400 };

          if (typeof ErrHandler === 'function') return reject(new ErrHandler(errResp));
          reject(new Error(errResp));
        });
    } catch (error) {
      reject(new Error(error.message));
    }
  });
};
