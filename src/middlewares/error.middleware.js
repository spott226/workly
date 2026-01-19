module.exports = (err, req, res, next) => {
  console.error(err);

  const knownErrors = {
    PLAN_LIMIT_EMPLOYEES: {
      status: 403,
      message: 'Límite de empleados alcanzado para tu plan.'
    },
    PLAN_NOT_FOUND: {
      status: 400,
      message: 'El plan seleccionado no existe.'
    }
  };

  if (knownErrors[err.message]) {
    const e = knownErrors[err.message];
    return res.status(e.status).json({
      code: err.message,
      message: e.message
    });
  }

  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Ocurrió un error inesperado.'
  });
};
