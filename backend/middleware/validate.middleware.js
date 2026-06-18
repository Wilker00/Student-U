function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fail(message) {
  return { error: message };
}

function ok(value) {
  return { value };
}

function validateSessionComplete(body) {
  if (!isObject(body)) return fail('Session body must be an object.');
  const courseKey = body.courseKey || body.courseId || body.course_id;
  if (!courseKey || typeof courseKey !== 'string') return fail('courseKey is required.');
  if (body.cards !== undefined && !Array.isArray(body.cards)) return fail('cards must be an array.');
  if (body.cardsList !== undefined && !Array.isArray(body.cardsList)) return fail('cardsList must be an array.');
  return ok(body);
}

function validateCourseCreate(body) {
  if (!isObject(body)) return fail('Course body must be an object.');
  if (body.title !== undefined && typeof body.title !== 'string') return fail('title must be a string.');
  if (body.code !== undefined && typeof body.code !== 'string') return fail('code must be a string.');
  if (body.id !== undefined && typeof body.id !== 'string') return fail('id must be a string.');
  return ok(body);
}

function validateQuizValidate(body) {
  if (!isObject(body)) return fail('Request body must be an object.');
  if (!isObject(body.card)) return fail('card is required.');
  if (!isObject(body.question)) return fail('question is required.');
  if (typeof body.question.question !== 'string') return fail('question.question must be a string.');
  return ok(body);
}

function validateWeakSpotDrills(body) {
  if (body === undefined || body === null) return ok({});
  if (!isObject(body)) return fail('Request body must be an object.');
  if (body.missedCardIds !== undefined && !Array.isArray(body.missedCardIds)) {
    return fail('missedCardIds must be an array.');
  }
  return ok(body);
}

function validateBody(schemaFn) {
  return (req, res, next) => {
    const result = schemaFn(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    req.validatedBody = result.value;
    next();
  };
}

module.exports = {
  validateBody,
  validateSessionComplete,
  validateCourseCreate,
  validateQuizValidate,
  validateWeakSpotDrills,
};
