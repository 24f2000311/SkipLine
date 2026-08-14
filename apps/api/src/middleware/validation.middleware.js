const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: result.error.issues,
        },
      });
    }

    req.validated = result.data;

    next();
  };
};

export default validate;
