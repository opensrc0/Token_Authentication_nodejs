var Joi = require('joi');

module.exports = {
  body: {
    userId: Joi.string().required(),
    password: Joi.string().regex(/[a-zA-Z0-9]{3,30}/).required()
  }
};
