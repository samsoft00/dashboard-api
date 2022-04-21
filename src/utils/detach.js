const detach = (request) => {
  request.then(
    // eslint-disable-next-line no-void
    () => void 0,
    (e) => {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  );
};

export default detach;
