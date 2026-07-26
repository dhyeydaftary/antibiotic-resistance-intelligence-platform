from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

import logging

from .dataset_stats import get_dataset_stats
from .serializers import PredictionRequestSerializer
from .predict import predict_resistance
from .trends import get_resistance_trend
from .ai_insights import generate_ai_insights
from .trend_insights import generate_trend_insights
from .pubmed_client import get_research_papers


logger = logging.getLogger(__name__)


@api_view(['GET'])
def trends_view(request):
    antibiotic = request.query_params.get('antibiotic')
    organism = request.query_params.get('organism', 'all')

    if not antibiotic:
        return Response(
            {
                "success": False,
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Query parameter 'antibiotic' is required",
                    "field": "antibiotic",
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        series = get_resistance_trend(antibiotic, organism)
    except ValueError as e:
        field = "organism" if "organism" in str(e).lower() else "antibiotic"
        return Response(
            {
                "success": False,
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": str(e),
                    "field": field,
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.exception("Unexpected error in trends_view")
        return Response(
            {
                "success": False,
                "data": None,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Something went wrong while fetching trend data.",
                    "field": None,
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {
            "success": True,
            "data": {
                "antibiotic": antibiotic,
                "organism": organism,
                "series": series,
            },
            "error": None,
        },
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
def explain_trend_view(request):
    antibiotic = request.query_params.get('antibiotic')
    organism = request.query_params.get('organism', 'all')

    if not antibiotic:
        return Response(
            {"success": False, "data": None, "error": {
                "code": "VALIDATION_ERROR",
                "message": "Query parameter 'antibiotic' is required",
                "field": "antibiotic",
            }},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        series = get_resistance_trend(antibiotic, organism)
        insights = generate_trend_insights(antibiotic, organism, series)
    except ValueError as e:
        field = "organism" if "organism" in str(e).lower() else "antibiotic"
        return Response(
            {"success": False, "data": None, "error": {
                "code": "VALIDATION_ERROR", "message": str(e), "field": field,
            }},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception:
        logger.exception("Unexpected error in explain_trend_view")
        return Response(
            {"success": False, "data": None, "error": {
                "code": "INTERNAL_ERROR",
                "message": "Something went wrong while generating the trend explanation.",
                "field": None,
            }},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {"success": True, "data": {
            "antibiotic": antibiotic, "organism": organism, "insights": insights,
        }, "error": None},
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
def dataset_stats_view(request):
    try:
        stats = get_dataset_stats()
    except Exception as e:
        logger.exception("Unexpected error in dataset_stats_view")
        return Response(
            {
                "success": False,
                "data": None,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Something went wrong while fetching dataset statistics.",
                    "field": None,
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {
            "success": True,
            "data": stats,
            "error": None,
        },
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
def predict_view(request):
    serializer = PredictionRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request data",
                    "field": serializer.errors,
                }
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    patient_data = serializer.validated_data

    try:
        predictions = predict_resistance(patient_data)
        ai_insights = generate_ai_insights(patient_data, predictions)
    except Exception as e:
        logger.exception("Unexpected error in predict_view")
        return Response(
            {
                "success": False,
                "data": None,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Something went wrong while generating the prediction.",
                    "field": None,
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {
            "success": True,
            "data": {
                "predictions": predictions,
                "aiInsights": ai_insights,
                "modelVersion": "v1.0",
            },
            "error": None,
        },
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
def research_papers_view(request):
    antibiotic = request.query_params.get('antibiotic')
    organism = request.query_params.get('organism', 'all')

    if not antibiotic:
        return Response(
            {"success": False, "data": None, "error": {
                "code": "VALIDATION_ERROR",
                "message": "Query parameter 'antibiotic' is required",
                "field": "antibiotic",
            }},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        papers = get_research_papers(antibiotic, organism)
    except Exception:
        logger.exception("Unexpected error in research_papers_view")
        return Response(
            {"success": False, "data": None, "error": {
                "code": "INTERNAL_ERROR",
                "message": "Something went wrong while fetching research papers.",
                "field": None,
            }},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {"success": True, "data": {
            "antibiotic": antibiotic, "organism": organism, "papers": papers,
        }, "error": None},
        status=status.HTTP_200_OK
    )