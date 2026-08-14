// ===================================================================
// Prediction routes — mounted at /api/predictor in index.js. This is
// the gateway<->Django boundary: every route here is either a thin,
// validated proxy to the Django ml-backend (via utils/djangoClient.js)
// or a query against this app's own Mongo history collection
// (models/PredictionHistory.js). No ML logic lives here — that's
// entirely ml-backend/predictor/predict.py and ai_insights.py.
//
// Talks to: middleware/verifyToken.js (every route requires auth),
// middleware/predictionRateLimiters.js (read vs. expensive budgets),
// utils/predictionValidation.js (mirrors Django's serializer — see
// that file), utils/domainAllowLists.js, utils/djangoClient.js (the
// actual HTTP call to Django's /predict/, /trends/, /dataset-stats/,
// /explain-trend/, /research-papers/, /extract-report/).
//
// If asked "why validate here AND in Django": defense in depth plus
// UX — rejecting a malformed request here avoids a wasted round trip
// to Django and a slower error, but Django's serializer is the real
// authority since it can't trust this layer either. If asked "what
// happens if Django is down": handleDjangoError() below turns that
// into a clean 500/504 with a safe message — never a raw stack trace
// or Django's HTML debug page reaching the client.
// ===================================================================
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const FormData = require('form-data');
const verifyToken = require('../middleware/verifyToken');
const PredictionHistory = require('../models/PredictionHistory');
const djangoClient = require('../utils/djangoClient');
const { logError } = require('../utils/logger');
const { validatePredictionData } = require('../utils/predictionValidation');
const { ORGANISM_LIST, ANTIBIOTIC_CODES, RESULT_VALUES } = require('../utils/domainAllowLists');
const { readLimiter, expensiveLimiter } = require('../middleware/predictionRateLimiters');

// Makes a user-supplied search string safe to embed in a RegExp.
// Escapes regex metacharacters so a user-supplied search string is always
// treated as a literal substring match, never as regex syntax — closes off
// both unintended pattern behavior and ReDoS via crafted catastrophic-
// backtracking patterns.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const MAX_SEARCH_LENGTH = 100;

// Turns a failed Django call into a safe client response — timeout,
// forwarded envelope error, or generic 500 — never a raw stack/debug page.
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

    logError(logLabel, {
      detail: 'unexpected non-envelope response from Django',
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
    logError(logLabel, {
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
// Every valid PDF must end with this trailer marker per the PDF spec —
// checking for it, not just the header, meaningfully deepens the
// pre-filter beyond "the first 5 bytes look right" (a %PDF--prefixed file
// with garbage content after it would otherwise pass). Scanning a
// generous tail window rather than requiring it be the literal last
// bytes — some PDF writers append a small amount of trailing data
// (whitespace, incremental-update markers) after the true %%EOF.
const PDF_EOF_MARKER = Buffer.from('%%EOF', 'ascii');
const PDF_EOF_SCAN_WINDOW = 2048;

// First-pass filter: multer's fileFilter only sees what the client reports
// (originalname, Content-Type of the multipart part) — it runs before any
// file data is read, so it cannot inspect actual content. Wrong-mimetype
// uploads are rejected here so obviously-wrong files never even finish
// uploading; the real check (magic bytes, once the buffer is in memory) is
// in the /extract-report handler below.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  // Rejects an upload outright if the client-declared MIME type isn't PDF.
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      req.fileValidationError = 'Only PDF files are supported.';
      return cb(null, false);
    }
    cb(null, true);
  },
});

// Validates patient data, forwards it to Django for prediction, and saves
// the result to this user's history.
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

    // Same averaging logic HistoryPage.jsx's summarizeRecord() computes
    // client-side on every render — computed once here instead, at write
    // time, so GET /history can sort on it directly in Mongo.
    const avgConfidence = predictions.length
      ? predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length
      : 0;

    await PredictionHistory.create({
      userId: req.userId,
      inputData: patientData,
      predictions: predictions,
      aiInsights: aiInsights,
      avgConfidence,
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


// Validates an uploaded PDF's real bytes, then forwards it to Django for
// LLM-based field extraction to auto-fill the prediction form.
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
    // is forwarded to Django. Both the header AND trailer must be present —
    // this is still a cheap, lightweight pre-filter, not full PDF parsing
    // (that's Django/pdfplumber's job downstream); it just now checks two
    // structural markers instead of one.
    const hasValidHeader = req.file.buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES);
    const tailStart = Math.max(0, req.file.buffer.length - PDF_EOF_SCAN_WINDOW);
    const hasValidTrailer = req.file.buffer.subarray(tailStart).includes(PDF_EOF_MARKER);

    if (!hasValidHeader || !hasValidTrailer) {
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

    // Never forward the client-supplied filename — it's an arbitrary,
    // attacker-controlled string with no legitimate use here (Django never
    // echoes it back, and it's never displayed anywhere). Generating a
    // fresh, safe filename server-side closes this unconditionally,
    // regardless of how the form-data package or anything downstream
    // happens to handle special characters in an untrusted string.
    const safeFilename = `${crypto.randomUUID()}.pdf`;

    const formData = new FormData();
    formData.append('report', req.file.buffer, {
      filename: safeFilename,
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


// Proxies a resistance-trend query to Django.
router.get('/trends', verifyToken, readLimiter, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/trends/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /trends:', 'Something went wrong while fetching trend data.');
  }
});


// Proxies a request for training-dataset summary statistics to Django.
router.get('/dataset-stats', verifyToken, readLimiter, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/dataset-stats/');

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /dataset-stats:', 'Something went wrong while fetching dataset statistics.');
  }
});


// Proxies a request for a narrative trend explanation to Django.
router.get('/explain-trend', verifyToken, readLimiter, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/explain-trend/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /explain-trend:', 'Something went wrong while generating the trend explanation.');
  }
});


// Proxies a PubMed research-paper lookup to Django.
router.get('/research-papers', verifyToken, expensiveLimiter, async (req, res) => {
  try {
    const djangoResponse = await djangoClient.get('/research-papers/', { params: req.query });

    res.status(200).json(djangoResponse.data);

  } catch (err) {
    handleDjangoError(err, res, 'Error in /research-papers:', 'Something went wrong while fetching research papers.');
  }
});


// All-time aggregate stats for this user's history: the stats tile, the
// quick-insights strip, and both filter-dropdowns' option lists + hover-
// preview stats. Deliberately takes no filter params — these numbers are
// always computed over the user's ENTIRE history regardless of whatever
// filters are currently active on the paginated /history list below, so
// the stats tile doesn't appear to "shrink" just because a filter is
// applied to the list underneath it.
//
// A single $facet pipeline computes every figure in one round trip rather
// than one query per figure — same reasoning as denormalizing
// avgConfidence onto the schema: push the aggregation into Mongo instead
// of loading every record into Node to compute it here.
router.get('/history/aggregates', verifyToken, readLimiter, async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [facets] = await PredictionHistory.aggregate([
      { $match: { userId: userObjectId } },
      {
        $facet: {
          // Total record count, all-time.
          totals: [{ $count: 'count' }],
          // Record count in the last 7 days (the stats tile's "this week").
          recentRecords: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $count: 'count' },
          ],
          // Resistant-prediction count in the last 7 vs. the 7 days before
          // that, for the week-over-week trend figure.
          recentResistant: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $unwind: '$predictions' },
            { $match: { 'predictions.result': 'R' } },
            { $count: 'count' },
          ],
          previousResistant: [
            { $match: { createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } } },
            { $unwind: '$predictions' },
            { $match: { 'predictions.result': 'R' } },
            { $count: 'count' },
          ],
          // Most recent record's timestamp, for the stats tile's "last
          // prediction" label (formatted client-side).
          lastRecord: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { _id: 0, createdAt: 1 } },
          ],
          // All-time R/S/I split across every prediction (not every
          // record) — the quick-insights strip's outcome mix.
          resultBreakdown: [
            { $unwind: '$predictions' },
            { $group: { _id: '$predictions.result', count: { $sum: 1 } } },
          ],
          // Per-antibiotic count/resistant-%/avg-confidence — the
          // Antibiotic filter dropdown's option list + hover-preview stats.
          antibioticStats: [
            { $unwind: '$predictions' },
            {
              $group: {
                _id: '$predictions.antibiotic',
                count: { $sum: 1 },
                resistant: { $sum: { $cond: [{ $eq: ['$predictions.result', 'R'] }, 1, 0] } },
                confidenceSum: { $sum: '$predictions.confidence' },
              },
            },
          ],
          // Per-organism record count/resistant-% (resistant-% is over
          // that organism's predictions, not its records) — the Organism
          // filter dropdown's option list + hover-preview stats.
          organismStats: [
            {
              $group: {
                _id: '$inputData.organism',
                count: { $sum: 1 },
                resistant: {
                  $sum: {
                    $size: { $filter: { input: '$predictions', as: 'p', cond: { $eq: ['$$p.result', 'R'] } } },
                  },
                },
                total: { $sum: { $size: '$predictions' } },
              },
            },
          ],
        },
      },
    ]);

    const total = facets.totals[0]?.count || 0;
    const thisWeek = facets.recentRecords[0]?.count || 0;
    const recentResistant = facets.recentResistant[0]?.count || 0;
    const previousResistant = facets.previousResistant[0]?.count || 0;
    const lastPredictionDate = facets.lastRecord[0]?.createdAt || null;

    const resultCounts = {};
    facets.resultBreakdown.forEach((r) => { resultCounts[r._id] = r.count; });
    const totalPredictions = (resultCounts.R || 0) + (resultCounts.S || 0) + (resultCounts.I || 0);
    const avgResistance = totalPredictions ? Math.round(((resultCounts.R || 0) / totalPredictions) * 100) : 0;
    const susceptibilityRate = totalPredictions ? Math.round(((resultCounts.S || 0) / totalPredictions) * 100) : 0;
    const intermediateRate = totalPredictions ? Math.round(((resultCounts.I || 0) / totalPredictions) * 100) : 0;

    const antibioticStats = {};
    let mostCommonAntibiotic = null;
    let mostCommonCount = -1;
    facets.antibioticStats.forEach((a) => {
      antibioticStats[a._id] = {
        count: a.count,
        resistantPct: a.count ? Math.round((a.resistant / a.count) * 100) : 0,
        avgConfidence: a.count ? Math.round((a.confidenceSum / a.count) * 100) : 0,
      };
      if (a.count > mostCommonCount) {
        mostCommonCount = a.count;
        mostCommonAntibiotic = a._id;
      }
    });
    const mostCommonAntibioticPct = mostCommonAntibiotic && totalPredictions
      ? Math.round((mostCommonCount / totalPredictions) * 100)
      : 0;

    const organismStats = {};
    facets.organismStats.forEach((o) => {
      organismStats[o._id] = {
        count: o.count,
        resistantPct: o.total ? Math.round((o.resistant / o.total) * 100) : 0,
      };
    });

    const trendChange = previousResistant > 0
      ? Math.round(((recentResistant - previousResistant) / previousResistant) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        total,
        thisWeek,
        avgResistance,
        lastPredictionDate,
        mostCommonAntibiotic,
        mostCommonAntibioticPct,
        trendChange,
        susceptibilityRate,
        intermediateRate,
        antibioticStats,
        organismStats,
        antibioticOptions: Object.keys(antibioticStats),
        organismOptions: Object.keys(organismStats),
      },
      error: null,
    });

  } catch (err) {
    logError('Error in /history/aggregates', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong while fetching history statistics.',
        field: null,
      },
    });
  }
});


// Sort options for GET /history, allow-listed the same way every other
// filter in that route is — an unrecognized value falls back to the
// default rather than erroring.
const HISTORY_SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'confidence-high': { avgConfidence: -1 },
  'confidence-low': { avgConfidence: 1 },
};
const DEFAULT_HISTORY_PAGE_LIMIT = 8;
// Absolute ceiling for `limit`, covering both normal paginated browsing
// (which never asks for more than a couple dozen at a time) and the
// frontend's CSV export flow (HistoryPage.jsx's handleExport), which
// deliberately requests one large page — up to 5000 records — instead of
// looping through paginated requests. There's no separate "export mode"
// flag: the same clamp applies to every request; normal UI usage never
// approaches it.
const MAX_HISTORY_PAGE_LIMIT = 5000;

// Builds a filtered Mongo query over this user's own prediction history
// from query-string filters and returns one page of matching records.
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
      sort,
      page: pageParam,
      limit: limitParam,
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
    // Treats a non-string/empty query param as "not provided" rather than an error.
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

    // --- Sort (allow-listed; unrecognized/missing value falls back to
    // the default, same as every filter above) ---
    const sortSpec = HISTORY_SORT_OPTIONS[sort] || HISTORY_SORT_OPTIONS.newest;

    // --- Pagination ---
    let page = parseInt(pageParam, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;

    let limit = parseInt(limitParam, 10);
    if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_HISTORY_PAGE_LIMIT;
    limit = Math.min(limit, MAX_HISTORY_PAGE_LIMIT);

    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      PredictionHistory.find(query).sort(sortSpec).skip(skip).limit(limit),
      PredictionHistory.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        history,
        page,
        limit,
        total,
        totalPages,
      },
      error: null,
    });

  } catch (err) {
    logError('Error in /history', { err });
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