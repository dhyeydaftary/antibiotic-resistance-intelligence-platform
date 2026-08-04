const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const verifyToken = require('../middleware/verifyToken');
const PredictionHistory = require('../models/PredictionHistory');
const djangoClient = require('../utils/djangoClient');
const { validatePredictionData } = require('../utils/predictionValidation');
const { ORGANISM_LIST, ANTIBIOTIC_CODES, RESULT_VALUES } = require('../utils/domainAllowLists');
const { readLimiter, expensiveLimiter } = require('../middleware/predictionRateLimiters');

// Escapes regex metacharacters so a user-supplied search string is always
// treated as a literal substring match, never as regex syntax — closes off
// both unintended pattern behavior and ReDoS via crafted catastrophic-
// backtracking patterns.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const MAX_SEARCH_LENGTH = 100;

// Shared handling for the repeated djangoClient error pattern across every
// route below: a timeout (axios sets err.code === 'ECONNABORTED' when the
// djangoClient timeout in utils/djangoClient.js is exceeded) gets a
// specific, actionable error code instead of falling into the generic
// INTERNAL_ERROR bucket — "the upstream service was too slow" is genuinely
// different information from "something broke", worth surfacing distinctly
// since it's cheap to do once here rather than duplicating the same check
// in all 6 call sites.
function handleDjangoError(err, res, logLabel, fallbackMessage) {
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({
      success: false,
      data: null,
      error: {
        code: 'UPSTREAM_TIMEOUT',
        message: 'The prediction service took too long to respond. Please try again.',
        field: null,
      },
    });
  }

  if (err.response) {
    const body = err.response.data;
    // Only forward Django's error body if it matches this app's established,
    // known-safe {success, data, error: {code, message, field}} envelope —
    // every legitimate error this app produces (validation errors,
    // InternalApiKeyMiddleware's 401, etc.) already takes this shape.
    // Anything else — most importantly, Django's own HTML debug page if
    // DEBUG is ever left on and an unhandled exception occurs — does NOT
    // match this shape, and must never be forwarded to the client: that
    // page can contain SECRET_KEY, other settings, and full local-variable
    // dumps from the crash. When the shape doesn't match, fall through to
    // the same generic INTERNAL_ERROR response used for every other
    // unexpected failure, and log a safe summary (not the raw body) so
    // it's still debuggable server-side.
    const isSafeEnvelope =
      body &&
      typeof body === 'object' &&
      body.success === false &&
      body.error &&
      typeof body.error.code === 'string';

    if (isSafeEnvelope) {
      return res.status(err.response.status).json(body);
    }

    console.error(logLabel, 'unexpected non-envelope response from Django', {
      status: err.response.status,
      url: err.config?.url,
    });
  } else {
    // No response at all (e.g. ECONNREFUSED, DNS failure, Django down).
    // djangoClient carries the internal service key as a default header
    // (utils/djangoClient.js) — axios error objects include the full
    // outgoing request config, including headers, so logging the raw err
    // object risks leaking that key into server logs. Log a safe,
    // reduced subset instead.
    console.error(logLabel, {
      message: err.message,
      code: err.code,
      url: err.config?.url,
      method: err.config?.method,
    });
  }

  return res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: fallbackMessage,
      field: null,
    },
  });
}

const router = express.Router();

const PDF_MAGIC_BYTES = Buffer.from('%PDF-', 'ascii');

// First-pass filter: multer's fileFilter only sees what the client reports
// (originalname, Content-Type of the multipart part) — it runs before any
// file data is read, so it cannot inspect actual content. Wrong-mimetype
// uploads are rejected here so obviously-wrong files never even finish
// uploading; the real check (magic bytes, once the buffer is in memory) is
// in the /extract-report handler below.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      req.fileValidationError = 'Only PDF files are supported.';
      return cb(null, false);
    }
    cb(null, true);
  },
});

router.post('/predict', verifyToken, expensiveLimiter, async (req, res) => {
  try {
    const validation = validatePredictionData(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.message,
          field: validation.field,
        },
      });
    }
    const patientData = validation.data;

    const djangoResponse = await djangoClient.post('/predict/', patientData);

    const { predictions, aiInsights, modelVersion } = djangoResponse.data.data;

    await PredictionHistory.create({
      userId: req.userId,
      inputData: patientData,
      predictions: predictions,
      aiInsights: aiInsights,
    });

    res.status(200).json({
      success: true,
      data: {
        predictions,
        aiInsights,
        modelVersion,
      },
      error: null,
    });

  } catch (err) {
    handleDjangoError(err, res, 'Error in /predict:', 'Something went wrong while generating the prediction.');
  }
});


router.post('/extract-report', verifyToken, expensiveLimiter, upload.single('report'), async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: req.fileValidationError,
          field: 'report',
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A PDF file is required under the "report" field',
          field: 'report',
        },
      });
    }

    // Real content check — the mimetype filter above only trusted the
    // client-supplied Content-Type; this checks the actual bytes now that
    // the whole file is in memory (multer.memoryStorage), before any of it
    // is forwarded to Django.
    if (!req.file.buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'This file does not appear to be a valid PDF.',
          field: 'report',
        },
      });
    }

    const formData = new FormData();
    formData.append('report', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const djangoResponse = await djangoClient.post('/extract-report/', formData, {
      headers: formData.getHeaders(),
    });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /extract-report:', 'Something went wrong while extracting the report.');
  }
});


router.get('/trends', verifyToken, readLimiter, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/trends/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /trends:', 'Something went wrong while fetching trend data.');
  }
});


router.get('/dataset-stats', verifyToken, readLimiter, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/dataset-stats/');

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /dataset-stats:', 'Something went wrong while fetching dataset statistics.');
  }
});


router.get('/explain-trend', verifyToken, readLimiter, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/explain-trend/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /explain-trend:', 'Something went wrong while generating the trend explanation.');
  }
});


router.get('/research-papers', verifyToken, expensiveLimiter, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/research-papers/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /research-papers:', 'Something went wrong while fetching research papers.');
  }
});


router.get('/history', verifyToken, readLimiter, async (req, res) => {
  try {
    const {
      result,
      antibiotic,
      confidenceMin,
      confidenceMax,
      organism,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    // Every filter below is optional and, if present, is expected to be a
    // single string value. Express's query parser can hand back an array
    // (repeated key, e.g. `?organism=a&organism=b`) or, depending on parser
    // config, other non-string shapes — none of that is a valid filter
    // value here. Rather than 400 the whole request (this route has always
    // treated a missing/unusable filter as "don't filter on this", never as
    // an error), a non-string value is simply dropped/ignored, same as if
    // it had never been sent — consistent with every other optional filter
    // in this route.
    const isUsableString = (v) => typeof v === 'string' && v.length > 0;

    const query = { userId: req.userId };

    // --- Organism filter (top-level field on inputData) — allow-listed ---
    if (isUsableString(organism) && ORGANISM_LIST.includes(organism)) {
      query['inputData.organism'] = organism;
    }

    // --- Date range filter (on createdAt, from timestamps) ---
    if (isUsableString(dateFrom) || isUsableString(dateTo)) {
      const createdAt = {};
      if (isUsableString(dateFrom)) {
        const from = new Date(dateFrom);
        if (!Number.isNaN(from.getTime())) createdAt.$gte = from;
      }
      if (isUsableString(dateTo)) {
        const to = new Date(dateTo);
        if (!Number.isNaN(to.getTime())) createdAt.$lte = to;
      }
      if (Object.keys(createdAt).length > 0) query.createdAt = createdAt;
    }

    // --- Result / Antibiotic / Confidence Range filter ---
    // These three combine into a single $elemMatch on the predictions array,
    // since they all describe a condition on ONE antibiotic entry within the record.
    const elemMatchConditions = {};

    if (isUsableString(antibiotic) && ANTIBIOTIC_CODES.includes(antibiotic)) {
      elemMatchConditions.antibiotic = antibiotic;
    }
    if (isUsableString(result) && RESULT_VALUES.includes(result)) {
      elemMatchConditions.result = result;
    }
    if (isUsableString(confidenceMin) || isUsableString(confidenceMax)) {
      const confidence = {};
      if (isUsableString(confidenceMin)) {
        const min = parseFloat(confidenceMin);
        if (!Number.isNaN(min)) confidence.$gte = min;
      }
      if (isUsableString(confidenceMax)) {
        const max = parseFloat(confidenceMax);
        if (!Number.isNaN(max)) confidence.$lte = max;
      }
      if (Object.keys(confidence).length > 0) elemMatchConditions.confidence = confidence;
    }

    if (Object.keys(elemMatchConditions).length > 0) {
      query.predictions = { $elemMatch: elemMatchConditions };
    }

    // --- Search (organism name or antibiotic name, case-insensitive) ---
    if (isUsableString(search)) {
      const trimmed = search.slice(0, MAX_SEARCH_LENGTH);
      const searchRegex = new RegExp(escapeRegex(trimmed), 'i');
      query.$or = [
        { 'inputData.organism': searchRegex },
        { 'predictions.antibiotic': searchRegex },
      ];
    }

    const history = await PredictionHistory.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        history,
      },
      error: null,
    });

  } catch (err) {
    console.error('Error in /history:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching prediction history.',
        field: null,
      },
    });
  }
});

module.exports = router;