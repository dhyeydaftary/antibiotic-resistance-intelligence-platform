from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .serializers import PredictionRequestSerializer
from .predict import predict_resistance


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
    except Exception as e:
        return Response(
            {
                "success": False,
                "data": None,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": str(e),
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
                "modelVersion": "v1.0",
            },
            "error": None,
        },
        status=status.HTTP_200_OK
    )