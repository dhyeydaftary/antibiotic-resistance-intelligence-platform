const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const verifyToken = require('../middleware/verifyToken');
const PredictionHistory = require('../models/PredictionHistory');
const djangoClient = require('../utils/djangoClient');
const { validatePredictionData } = require('../utils/predictionValidation');
const { ORGANISM_LIST, ANTIBIOTIC_CODES, RESULT_VALUES } = require('../utils/domainAllowLists');

// Escapes regex metacharacters so a user-supplied search string is always
// treated as a literal substring match, never as regex syntax — closes off
// both unintended pattern behavior and ReDoS via crafted catastrophic-
// backtracking patterns.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const MAX_SEARCH_LENGTH = 100;

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

router.post('/predict', verifyToken, async (req, res) => {
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
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /predict:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while generating the prediction.',
        field: null,
      },
    });
  }
});


router.post('/extract-report', verifyToken, upload.single('report'), async (req, res) => {
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
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /extract-report:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while extracting the report.',
        field: null,
      },
    });
  }
});


router.get('/trends', verifyToken, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/trends/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /trends:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching trend data.',
        field: null,
      },
    });
  }
});


router.get('/dataset-stats', verifyToken, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/dataset-stats/');

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /dataset-stats:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching dataset statistics.',
        field: null,
      },
    });
  }
});


router.get('/explain-trend', verifyToken, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/explain-trend/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /explain-trend:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while generating the trend explanation.',
        field: null,
      },
    });
  }
});


router.get('/research-papers', verifyToken, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/research-papers/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }

    console.error('Error in /research-papers:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching research papers.',
        field: null,
      },
    });
  }
});


router.get('/history', verifyToken, async (req, res) => {
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